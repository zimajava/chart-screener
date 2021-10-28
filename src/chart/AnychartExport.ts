/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-empty-function */
import * as fs from 'fs';
import * as path from 'path';
import { isObject } from 'util';
import { spawn } from 'child_process';
import * as mime from 'mime-types';
import { DOMParser } from 'xmldom';
import fastXmlParser from 'fast-xml-parser';
import * as request from 'request';
// import { loopWhile } from 'deasync';
import * as vm from 'vm2';
import { subClass, SubClass } from 'gm';
import * as opentype from 'opentype.js';
import async from 'async';
import { v4 as uuidv4 } from 'uuid';
import { DOMWindow } from 'jsdom';
// @ts-ignore
import * as chart from 'anychart';

function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) {
    return origin;
  }

  const keys = Object.keys(add);
  let i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }

  return origin;
}

interface Params {
  dataType: any;
  outputType: any;
  containerId: any;
  callback: any;
  resources?: any;
  document?: any;
  iframeId?: any;
}

export class AnychartExport {
  static anychart: chart;
  static rootDoc: DOMWindow['document'] = null;
  static iframeDoc: DOMWindow['document'] = null;
  static iframes: Record<string, any> = {};
  static fonts: Record<string, opentype.Font> = {};
  static loadDefaultFontsSync: (pathToFontFolder?: string) => void;
  static getInstance: (anychartInst, domWindow: DOMWindow) => AnychartExport;
  static setAsRootDocument: (doc) => void;
  static anychartify: (rootDoc: DOMWindow['document']) => void;
  static getBBox: () => { x: number; width: number; y: number; height: number };
  private convertQueue: async.QueueObject<any>;
  private readonly gm: SubClass;
  private readonly defaultBounds: { top: number; left: number; width: number; height: number };
  private readonly xmlNs: string;
  private readonly defaultParallelsTasks: number;
  private readonly vectorImageParams: string[];

  constructor(anychartInst) {
    AnychartExport.anychart = anychartInst;
    this.gm = subClass({ imageMagick: true });
    this.defaultBounds = { left: 0, top: 0, width: 1024, height: 768 };
    this.xmlNs = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
    this.defaultParallelsTasks = 500;
    this.vectorImageParams = [
      'background',
      'border',
      'blur',
      'contrast',
      'crop',
      'frame',
      'gamma',
      'monochrome',
      'negative',
      'noise',
      'quality',
    ];
    this.convertQueue = async.queue(this.workerForConverting.bind(this), this.defaultParallelsTasks);
  }

  exportTo(target, options) {
    if (!target) {
      console.warn("Can't read input data for exporting.");
    }

    const params: Params = AnychartExport.getParams(arguments);

    return new Promise((resolve, reject) => {
      try {
        this.getSvg(target, params, (err, svg, params) => {
          const done = (err, image) => {
            if (err) {
              reject(err);
            } else {
              resolve(image);
            }
          };
          this.convertSvgToImageData(svg, params, done);
        });
      } catch (e) {
        reject(e);
        return;
      }
    });
  }

  private getSvg(target, params: Params, callback: (err, svg, params) => void) {
    const dataType = params.dataType;

    if (dataType === 'svg') {
      return callback(null, AnychartExport.fixSvg(target), params);
    } else {
      let svg;
      let container;
      let svgElement;
      const res = params.resources;

      let isChart = dataType === 'chart';
      const isStage = dataType === 'stage';

      if (!params.document && !(isChart || isStage)) {
        params.iframeId = AnychartExport.createSandbox(params.containerId);
        params.document = AnychartExport.iframeDoc;
      }

      if (params.document) {
        this.prepareDocumentForRender(params.document);
      }

      return this.loadExternalResources(res, params, (err, params) => {
        const XMLParser = new DOMParser();
        const domWindow = params.document.defaultView;
        let bounds;
        let width;
        let height;

        if (domWindow) {
          AnychartExport.anychart.global(domWindow);
        }

        if (dataType === 'javascript') {
          const script = new vm.VM({ timeout: 10000, sandbox: { anychart: domWindow.anychart } });

          script.run(target);

          const svgElements = params.document.getElementsByTagName('svg');
          const chartToDispose = [];

          for (let i = 0, len = svgElements.length; i < len; i++) {
            svgElement = svgElements[i];

            if (!svgElement) {
              continue;
            }

            const id = svgElement.getAttribute('ac-id');
            const stage = AnychartExport.anychart.graphics.getStage(id);

            if (stage) {
              const charts = stage.getCharts();

              for (const chartId in charts) {
                const chart = charts[chartId];
                bounds = chart.bounds();
                svg = this.getSvgString(svgElement, bounds.width(), bounds.height());
                chartToDispose.push(chart);
              }

              stage.dispose();
            }
          }

          for (let i = 0, len = chartToDispose.length; i < len; i++) {
            chartToDispose[i].dispose();
          }
        } else {
          if (dataType === 'json') {
            target = AnychartExport.anychart.fromJson(target);
            isChart = true;
          } else if (dataType === 'xml') {
            target = AnychartExport.anychart.fromXml(XMLParser.parseFromString(target));
            isChart = true;
          }

          target.container(params.containerId);

          if (isChart || isStage) {
            if (target.animation) {
              target.animation(false);
            }

            if (target.a11y) {
              target.a11y(false);
            }

            container = target.container();

            if (!container) {
              if (params.document) {
                const div = params.document.createElement('div');
                div.setAttribute('id', params.containerId);
                params.document.body.appendChild(div);
              } else if (isChart) {
                //todo (blackart) for resolve this case need to add link to chart instance for parent anychart object. while it's not true will be used this approach.
                params.iframeId = AnychartExport.createSandbox(params.containerId);
                params.document = AnychartExport.iframeDoc;
                this.prepareDocumentForRender(params.document);
                AnychartExport.anychart.global(domWindow);
                target = AnychartExport.anychart.fromJson(target.toJson());
              } else {
                console.warn(
                  "Warning! Cannot find context of executing. Please define 'document' in exporting params.",
                );
                return callback(null, '', params);
              }
              target.container(params.containerId);
              container = target.container();
            }

            if (isChart) {
              target.draw();

              bounds = target.bounds();
              width = bounds.width();
              height = bounds.height();
            } else {
              target.resume();

              bounds = target.getBounds();
              width = bounds.width;
              height = bounds.height;
            }

            svgElement = isChart ? container.getStage().domElement() : target.domElement();
            svg = this.getSvgString(svgElement, width, height);

            if (dataType === 'json' && dataType === 'xml') {
              target.dispose();
            }
          } else {
            console.warn('Warning! Wrong format of incoming data.');
            svg = '';
          }
        }
        AnychartExport.clearSandbox(params.iframeId);

        return callback(null, AnychartExport.fixSvg(svg), params);
      });
    }
  }

  private static clearSandbox(iframeId: any) {
    const iFrame = AnychartExport.rootDoc.getElementById(iframeId);

    if (!iframeId || !iFrame) {
      return;
    }

    // @ts-ignore
    AnychartExport.iframeDoc = iFrame.contentDocument;
    const iframeWindow = AnychartExport.iframeDoc.defaultView;
    iframeWindow.anychart = null;
    // @ts-ignore
    iframeWindow.acgraph = null;
    AnychartExport.iframeDoc.createElementNS = null;
    AnychartExport.iframeDoc.body.innerHTML = '';
    // @ts-ignore
    iFrame.contentDocument = null;
    AnychartExport.rootDoc.body.removeChild(iFrame);
    delete AnychartExport.iframes[iframeId];
  }

  private getSvgString(svgElement, width, height) {
    let svg = '';

    if (svgElement) {
      if (!width || AnychartExport.isPercent(width)) {
        width = this.defaultBounds.width;
      }

      if (!height || AnychartExport.isPercent(height)) {
        height = this.defaultBounds.height;
      }

      svgElement.setAttribute('width', width);
      svgElement.setAttribute('height', height);
      svg = `${this.xmlNs}${svgElement.outerHTML}`;
    }

    return svg;
  }

  private static fixSvg(svg): string {
    return (
      svg
        //jsdom bug - (https://github.com/tmpvar/jsdom/issues/620)
        // .replace(/textpath/g, 'textPath')
        // .replace(/lineargradient/g, 'linearGradient')
        // .replace(/radialgradient/g, 'radialGradient')
        // .replace(/clippath/g, 'clipPath')
        // .replace(/patternunits/g, 'patternUnits')
        //fixes for wrong id naming
        .replace(/(id=")#/g, '$1')
        .replace(/(url\()##/g, '$1#')
        //anychart a11y
        .replace(/aria-label=".*?"/g, '')
    );
  }

  private static getParams(args: IArguments) {
    const arrLength = args.length;
    const lastArg = args[arrLength - 1];
    const callback = AnychartExport.isFunction(lastArg) ? lastArg : null;

    const options = arrLength === 1 ? void 0 : callback ? (arrLength > 2 ? args[arrLength - 2] : void 0) : lastArg;
    const params = {
      callback: undefined,
      outputType: undefined,
      dataType: undefined,
      containerId: undefined,
    };

    params.callback = callback;

    if (typeof options === 'string') {
      params.outputType = options;
    } else if (typeof options === 'object') {
      extend(params, options);
    }

    let target = args[0];

    if (target && !AnychartExport.isDef(params.dataType)) {
      if (typeof target === 'string') {
        target = target.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');

        try {
          JSON.parse(target);
          params.dataType = 'json';
        } catch (e) {
          if (fastXmlParser.validate(target)) {
            if (target.lastIndexOf('<svg') !== -1) {
              params.dataType = 'svg';
            } else {
              params.dataType = 'xml';
            }
          } else {
            params.dataType = 'javascript';
          }
        }
      } else {
        const isChart = typeof target.draw === 'function';
        const isStage = typeof target.resume === 'function';
        params.dataType = isChart ? 'chart' : isStage ? 'stage' : void 0;
      }
    }

    if (!params.outputType) {
      params.outputType = 'jpg';
    }

    if (!AnychartExport.isDef(params.containerId)) {
      if (params.dataType === 'javascript') {
        const regex = /\.container\(('|")(.*)('|")\)/g;
        const result = regex.exec(target);
        params.containerId = result ? result[2] : 'container';
      } else {
        params.containerId = 'container';
      }
    }

    return params;
  }

  private static createSandbox(containerId: any): string {
    const iframeId = 'iframe_' + uuidv4();
    const iframe = AnychartExport.rootDoc.createElement('iframe');
    iframe.setAttribute('id', iframeId);
    AnychartExport.iframes[iframeId] = iframe;
    AnychartExport.rootDoc.body.appendChild(iframe);
    AnychartExport.iframeDoc = iframe.contentDocument;

    const div = AnychartExport.iframeDoc.createElement('div');
    div.setAttribute('id', containerId);
    AnychartExport.iframeDoc.body.appendChild(div);

    return iframeId;
  }

  private prepareDocumentForRender(doc: any): void {
    AnychartExport.anychartify(doc);

    const domWindow = doc.defaultView;
    domWindow.anychart = AnychartExport.anychart;
    domWindow.acgraph = AnychartExport.anychart.graphics;
    domWindow.isNodeJS = true;
    domWindow.defaultBounds = this.defaultBounds;
    domWindow.setTimeout = function (code, delay) {};
    domWindow.setInterval = function (code, delay) {};
  }

  private loadExternalResources(resources: any, params: Params, callback: (err, params) => void) {
    if (Object.prototype.toString.call(resources) === '[object Array]') {
      const loadedResources = [];

      for (let i = 0, len = resources.length; i < len; i++) {
        request.get(resources[i], (err, response, body) => {
          if (err) {
            loadedResources.push('');
          } else {
            loadedResources.push({
              type: mime.contentType(response.headers['content-type']),
              body: body,
            });
          }

          if (resources.length === loadedResources.length) {
            return AnychartExport.applyResourcesToDoc(params, loadedResources, callback);
          }
        });
      }

      if (resources.length === loadedResources.length) {
        return AnychartExport.applyResourcesToDoc(params, loadedResources, callback);
      }
    } else {
      return callback(null, params);
    }
  }

  private static applyResourcesToDoc(params: Params, resources: any[], callback: (err, params) => void) {
    const doc = params.document;
    const head = doc.getElementsByTagName('head')[0];
    const domWindow = doc.defaultView;
    let scripts = '';

    for (let i = 0, len = resources.length; i < len; i++) {
      const resource = resources[i];
      const type = resource.type;

      if (type == mime.contentType('css')) {
        const style = doc.createElement('style');
        style.innerHTML = resource.body;
        head.appendChild(style);

        // todo font loading
        // const font = new FontFaceObserver('Conv_interdex');
        // font.load().then(function () {});
      } else if (type == mime.contentType('js')) {
        scripts += ' ' + resource.body + ';';
      }
    }

    let err = null;
    try {
      const script = new vm.VM({
        timeout: 5000,
        sandbox: domWindow,
      });
      script.run(scripts);
    } catch (e) {
      console.log(e);
      err = e;
    }

    return callback(err, params);
  }

  private convertSvgToImageData(svg, params, callback) {
    this.convertQueue.push({ svg: svg, params: params }, callback);
  }

  // private convertSvgToImageDataSync(svg, params) {
  //   if (AnychartExport.isVectorFormat(params.outputType)) {
  //     const convertParams = ['-f', params.outputType];
  //     if (AnychartExport.isDef(params.width)) {
  //       convertParams.push('-w', params.width);
  //     }
  //     if (AnychartExport.isDef(params.height)) {
  //       convertParams.push('-h', params.height);
  //     }
  //     if (AnychartExport.isDef(params['aspect-ratio']) && String(params['aspect-ratio']).toLowerCase() !== 'false') {
  //       convertParams.push('-a');
  //     }
  //     if (AnychartExport.isDef(params.background)) {
  //       convertParams.push('-b', params.background);
  //     }
  //
  //     return spawnSync('rsvg-convert', convertParams, { input: svg }).stdout;
  //   } else {
  //     let done = false;
  //     let data = null;
  //     let error = null;
  //
  //     const img = this.gm(Buffer.from(svg, 'utf8'));
  //     this.applyImageParams(img, params);
  //     img.toBuffer(params.outputType, function (err, buffer) {
  //       data = buffer;
  //       error = err;
  //       done = true;
  //     });
  //     loopWhile(() => !done);
  //     return data;
  //   }
  // }

  private workerForConverting(task, done) {
    // if (AnychartExport.isVectorFormat(task.params.outputType)) {
    //   let childProcess;
    //   let callBackAlreadyCalled = false;
    //   try {
    //     const params = ['-f', task.params.outputType];
    //
    //     if (AnychartExport.isDef(task.params.width)) {
    //       params.push('-w', task.params.width);
    //     }
    //     if (AnychartExport.isDef(task.params.height)) {
    //       params.push('-h', task.params.height);
    //     }
    //     if (
    //       AnychartExport.isDef(task.params['aspect-ratio']) &&
    //       String(task.params['aspect-ratio']).toLowerCase() != 'false'
    //     ) {
    //       params.push('-a');
    //     }
    //     if (AnychartExport.isDef(task.params.background)) {
    //       params.push('-b', task.params.background);
    //     }
    //
    //     childProcess = spawn('rsvg-convert', params);
    //     let buffer;
    //     childProcess.stdout.on('data', function (data) {
    //       try {
    //         const prevBufferLength = buffer ? buffer.length : 0,
    //           newBuffer = new Buffer(prevBufferLength + data.length);
    //
    //         if (buffer) {
    //           buffer.copy(newBuffer, 0, 0);
    //         }
    //
    //         data.copy(newBuffer, prevBufferLength, 0);
    //
    //         buffer = newBuffer;
    //       } catch (err) {
    //         if (!callBackAlreadyCalled) {
    //           done(err, null);
    //           callBackAlreadyCalled = true;
    //         }
    //       }
    //     });
    //
    //     childProcess.on('close', function (code, signal) {
    //       if (!code && !callBackAlreadyCalled) {
    //         done(null, buffer);
    //       } else {
    //         console.warn('Unexpected close of child process with code %s signal %s', code, signal);
    //       }
    //     });
    //
    //     childProcess.stderr.on('data', function (data) {
    //       if (!callBackAlreadyCalled) {
    //         done(new Error(data), null);
    //         callBackAlreadyCalled = true;
    //       }
    //     });
    //
    //     childProcess.on('error', function (err) {
    //       if (err.code === 'ENOENT') {
    //         console.warn('Warning! Please install librsvg package.');
    //       }
    //       if (!callBackAlreadyCalled) {
    //         done(err, null);
    //         callBackAlreadyCalled = true;
    //       }
    //     });
    //
    //     childProcess.stdin.write(task.svg);
    //     childProcess.stdin.end();
    //   } catch (err) {
    //     if (!callBackAlreadyCalled) {
    //       done(err, null);
    //       callBackAlreadyCalled = true;
    //     }
    //   }
    // } else {
    const img = this.gm(Buffer.from(task.svg, 'utf8'));
    this.applyImageParams(img, task.params);
    img.toBuffer(task.params.outputType, done);
    // }
  }

  private applyImageParams(img: any, params) {
    for (let i = 0, len = this.vectorImageParams.length; i < len; i++) {
      const paramName = this.vectorImageParams[i];
      const value = params[paramName];

      if (value) {
        // eslint-disable-next-line prefer-spread
        img[paramName].apply(img, Object.prototype.toString.call(value) === '[object Array]' ? value : [value]);
      }
    }
  }

  private static isFunction(value: any): boolean {
    return typeof value == 'function';
  }

  private static isDef(value: any): boolean {
    return value != void 0;
  }

  private static isPercent(value) {
    if (value == null) {
      return false;
    }

    const l = value.length - 1;

    return typeof value == 'string' && l >= 0 && value.indexOf('%', l) == l;
  }

  private static isVectorFormat(type) {
    return type === 'pdf' || type === 'ps' || type === 'svg';
  }
}

AnychartExport.loadDefaultFontsSync = function (pathToFontFolder?): void {
  const defaultFontsDir = pathToFontFolder || path.resolve(process.cwd(), 'fonts');

  try {
    const fontFilesList = fs.readdirSync(defaultFontsDir);

    fontFilesList.forEach((fileName) => {
      const font = opentype.loadSync(`${defaultFontsDir}/${fileName}`);
      AnychartExport.fonts[font.names.fullName.en.toLowerCase()] = font;
    });
  } catch (e) {
    console.error('Error load fonts', e);
  }
};

AnychartExport.getInstance = function (anychartInst, domWindow: DOMWindow): AnychartExport {
  const isWin = /^win/.test(process.platform);
  let childProcess = spawn(isWin ? 'magick' : 'convert');

  childProcess.on('error', function (err) {
    // @ts-ignore
    if (err.code === 'ENOENT') {
      console.warn(
        'Warning! Please install imagemagick utility. (https://www.imagemagick.org/script/binary-releases.php)',
      );
    }
  });
  childProcess.stdin.on('error', () => {});
  childProcess.stdin.write('');
  childProcess.stdin.end();

  childProcess = spawn('rsvg-convert');
  childProcess.on('error', function (err) {
    // @ts-ignore
    if (err.code === 'ENOENT') {
      console.warn('Warning! Please install rsvglib utility. (https://github.com/AnyChart/AnyChart-NodeJS)');
    }
  });
  childProcess.stdin.on('error', () => {});
  childProcess.stdin.write('');
  childProcess.stdin.end();

  AnychartExport.loadDefaultFontsSync();
  AnychartExport.setAsRootDocument(domWindow.document);

  return new AnychartExport(anychartInst);
};

AnychartExport.setAsRootDocument = function (doc): void {
  AnychartExport.rootDoc = doc;
  const domWindow = AnychartExport.rootDoc.defaultView;
  // @ts-ignore
  domWindow.setTimeout = function (code, delay) {};
  // @ts-ignore
  domWindow.setInterval = function (code, delay) {};
  AnychartExport.anychartify(AnychartExport.rootDoc);
};

AnychartExport.anychartify = function (rootDoc) {
  rootDoc.createElementNS = function (ns, tagName) {
    const elem = rootDoc.createElement(tagName);
    elem.getBBox = elem.getBBox || AnychartExport.getBBox;
    return elem;
  };
};

AnychartExport.getBBox = function (): { x: number; y: number; width: number; height: number } {
  const text = this.textContent;
  const fontSize = parseFloat(this.getAttribute('font-size'));
  let fontFamily = this.getAttribute('font-family');

  if (fontFamily) {
    fontFamily = fontFamily.toLowerCase();
  }

  let fontWeight = this.getAttribute('font-weight');

  if (fontWeight) {
    fontWeight = fontWeight.toLowerCase();
  }

  let fontStyle = this.getAttribute('font-style');

  if (fontStyle) {
    fontStyle = fontStyle.toLowerCase();
  }

  let fontsArr = [];

  if (fontFamily) {
    fontsArr = fontFamily.split(', ');
  }

  let font;

  for (let i = 0, len = fontsArr.length; i < len; i++) {
    const weight = `${fontWeight === 'normal' || !isNaN(+fontWeight) ? '' : fontWeight}`;
    const style = `${fontStyle === 'normal' ? '' : fontStyle}`;
    const name = `${fontsArr[i]} ${weight} ${style}`;
    font = AnychartExport.fonts[String(name).trim()];

    if (font) {
      break;
    }
  }

  if (!font) {
    font = AnychartExport.fonts['verdana'];
  }

  const scale = (1 / font.unitsPerEm) * fontSize;
  const top = -font.ascender * scale;
  const height = Math.abs(top) + Math.abs(font.descender * scale);
  let width = 0;

  font.forEachGlyph(text, 0, 0, fontSize, undefined, function (glyph, x, y, fontSize, options) {
    const metrics = glyph.getMetrics();
    metrics.xMin *= scale;
    metrics.xMax *= scale;
    metrics.leftSideBearing *= scale;
    metrics.rightSideBearing *= scale;

    width += Math.abs(metrics.xMax - metrics.xMin) + metrics.leftSideBearing + metrics.rightSideBearing;
  });

  return { x: 0, y: top, width, height };
};
