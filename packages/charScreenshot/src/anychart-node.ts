import mime from 'mime-types';
import {DOMParser} from 'xmldom';
import fastXmlParser from 'fast-xml-parser';
import request from 'request';
import deasync from 'deasync';
import vm from "vm2";
import fs from 'fs';
import {subClass} from 'gm';
import {execSync, spawn, spawnSync} from 'child_process';
import util from 'util';
import opentype from 'opentype.js';
import async from 'async';
import {v4 as uuidv4} from 'uuid';
import {JSDOM} from 'jsdom';

// @ts-ignore
const extend = util._extend
const gm = subClass({imageMagick: true});
const xmlNs = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
const XMLparser = new DOMParser();
const defaultFontsDir = __dirname + '/../fonts';
const promiseLibrary = typeof global.Promise === 'function' ? global.Promise : require('es6-promise').Promise;
const isWin = /^win/.test(process.platform);
const defaultParallelsTasks = 100;
const convertQueue = async.queue(workerForConverting, defaultParallelsTasks);
const fonts = {};
const defaultBounds = {left: 0, top: 0, width: 1024, height: 768};
const vectorImageParams = ['background', 'border', 'blur', 'contrast', 'crop', 'frame', 'gamma', 'monochrome', 'negative', 'noise', 'quality'];
let childProcess = spawn(isWin ? 'magick' : 'convert');


childProcess.on('error', function (err) {
    // @ts-ignore
    if (err.code === 'ENOENT') {
        console.warn('Warning! Please install imagemagick utility. (https://www.imagemagick.org/script/binary-releases.php)');
    }
});
childProcess.stdin.on('error', function (err) {});
childProcess.stdin.write('');
childProcess.stdin.end();

childProcess = spawn('rsvg-convert');
childProcess.on('error', function (err) {
    // @ts-ignore
    if (err.code === 'ENOENT') {
        console.warn('Warning! Please install rsvglib utility. (https://github.com/AnyChart/AnyChart-NodeJS)');
    }
});
childProcess.stdin.on('error', function (err) {
});
childProcess.stdin.write('');
childProcess.stdin.end();

// ///////////////////////////////

let iframeDoc = null
let rootDoc = null
let iframes = {}
// // @ts-ignore
// let anychart = typeof anychart === 'undefined' ? anychart : void 0;
//
// if (anychart) {
//     const doc = anychart.global() && anychart.global().document || createDocument();
//     setAsRootDocument(doc);
// } else {
    setAsRootDocument(createDocument());
    // @ts-ignore
let anychart = require('anychart')(rootDoc.defaultView);
// }

//region --- Utils and settings
function setAsRootDocument(doc) {
    rootDoc = doc;
    // @ts-ignore
    const window = rootDoc.defaultView;
    window.setTimeout = function (code, delay) {};
    window.setInterval = function (code, delay) {};
    anychartify(rootDoc);

    return rootDoc
}

function createDocument() {
    return (new JSDOM('', {runScripts: 'dangerously'})).window.document;
}

function createSandbox(containerTd) {
    const iframeId = 'iframe_' + uuidv4();
    // @ts-ignore
    const iframe = rootDoc.createElement('iframe');
    iframes[iframeId] = iframe;
    iframe.setAttribute('id', iframeId);
    // @ts-ignore
    rootDoc.body.appendChild(iframe);
    iframeDoc = iframe.contentDocument;
    // @ts-ignore
    const div = iframeDoc.createElement('div');
    div.setAttribute('id', containerTd);
    // @ts-ignore
    iframeDoc.body.appendChild(div);

    return iframeId;
}

function clearSandbox(iframeId) {
    // @ts-ignore
    const iFrame = rootDoc.getElementById(iframeId);
    if (!iframeId || !iFrame) return;
    iframeDoc = iFrame.contentDocument;
    // @ts-ignore
    const iframeWindow = iframeDoc.defaultView;
    iframeWindow.anychart = null;
    iframeWindow.acgraph = null;
    // @ts-ignore
    iframeDoc.createElementNS = null;
    // @ts-ignore
    iframeDoc.body.innerHTML = '';
    iFrame.contentDocument = null;
    // @ts-ignore
    rootDoc.body.removeChild(iFrame);
    delete iframes[iframeId];
}

function isPercent(value) {
    if (value == null)
        return false;
    const l = value.length - 1;
    return (typeof value == 'string') && l >= 0 && value.indexOf('%', l) == l;
}

function isDef(value) {
    return value != void 0;
}

function isVectorFormat(type) {
    return type === 'pdf' || type === 'ps' || type === 'svg';
}

function applyImageParams(img, params) {
    for (let i = 0, len = vectorImageParams.length; i < len; i++) {
        const paramName = vectorImageParams[i];
        const value = params[paramName];
        if (value)
            img[paramName].apply(img, Object.prototype.toString.call(value) === '[object Array]' ? value : [value]);
    }
}

function isFunction(value) {
    return typeof (value) == 'function';
}

function concurrency(count) {
    // const availableProcForExec = getAvailableProcessesCount();
    //
    // if (count > availableProcForExec) {
    //   count = availableProcForExec;
    //   console.log('Warning! You can spawn only ' + availableProcForExec + ' process at a time.');
    // }
    convertQueue.concurrency = count;
}

function getBBox() {
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

    let fontsArr = []

    if (fontFamily) {
        fontsArr = fontFamily.split(', ');
    }


    let font;

    for (let i = 0, len = fontsArr.length; i < len; i++) {
        const name = fontsArr[i] + (fontWeight == 'normal' || !isNaN(+fontWeight) ? '' : ' ' + fontWeight) + (fontStyle == 'normal' ? '' : ' ' + fontStyle);

        if (font = fonts[name]){
            break;
        }
    }

    if (!font) {
        font = fonts['verdana'];
    }

    const scale = 1 / font.unitsPerEm * fontSize;
    const top = -font.ascender * scale;
    const height = Math.abs(top) + Math.abs(font.descender * scale);
    let width = 0;

    font.forEachGlyph(text, 0, 0, fontSize, undefined, function (glyph, x, y, fontSize, options) {
        const metrics = glyph.getMetrics();
        metrics.xMin *= scale;
        metrics.xMax *= scale;
        metrics.leftSideBearing *= scale;
        metrics.rightSideBearing *= scale;

        width += Math.abs(metrics.xMax - metrics.xMin) + metrics.leftSideBearing + metrics.rightSideBearing
    });

    return {x: 0, y: top, width: width, height: height};
}

function anychartify(doc) {
    doc.createElementNS = function (ns, tagName) {
        const elem = doc.createElement(tagName);
        elem.getBBox = elem.getBBox || getBBox;
        return elem;
    };
}

function prepareDocumentForRender(doc) {
    anychartify(doc);

    const window = doc.defaultView;
    window.anychart = anychart;
    window.acgraph = anychart.graphics;
    window.isNodeJS = true;
    window.defaultBounds = defaultBounds;
    window.setTimeout = function (code, delay) {};
    window.setInterval = function (code, delay) {};
}

function getParams(args) {
    const arrLength = args.length;
    const lastArg = args[arrLength - 1];
    const callback = isFunction(lastArg) ? lastArg : null;

    const options = arrLength === 1 ? void 0 : callback ? arrLength > 2 ? args[arrLength - 2] : void 0 : lastArg;
    const params = {
        callback: undefined,
        outputType: undefined,
        dataType: undefined,
        containerId: undefined
    };

    params.callback = callback;

    if (typeof options === 'string') {
        // @ts-ignore
        params.outputType = options;
    } else if (typeof options === 'object') {
        extend(params, options)
    }

    let target = args[0];

    if (target && !isDef(params.dataType)) {
        if (typeof target === 'string') {
            target = target.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');

            try {
                JSON.parse(target);
                // @ts-ignore
                params.dataType = 'json';
            } catch (e) {
                if (fastXmlParser.validate(target)) {
                    if (target.lastIndexOf('<svg') !== -1) {
                        // @ts-ignore
                        params.dataType = 'svg';
                    } else {
                        // @ts-ignore
                        params.dataType = 'xml';
                    }
                } else {
                    // @ts-ignore
                    params.dataType = 'javascript';
                }
            }
        } else {
            const isChart = typeof target.draw === 'function';
            const isStage = typeof target.resume === 'function';
            // @ts-ignore
            params.dataType = isChart ? 'chart' : isStage ? 'stage' : void 0;
        }
    }

    if (!params.outputType) {
        // @ts-ignore
        params.outputType = 'jpg';
    }

    if (!isDef(params.containerId)) {
        if (params.dataType === 'javascript') {
            const regex = /\.container\(('|")(.*)('|")\)/g;
            const result = regex.exec(target);
            // @ts-ignore
            params.containerId = result ? result[2] : 'container';
        } else {
            // @ts-ignore
            params.containerId = 'container';
        }
    }

    return params;
}

function fixSvg(svg) {
    return svg
        //jsdom bug - (https://github.com/tmpvar/jsdom/issues/620)
        .replace(/textpath/g, 'textPath')
        .replace(/lineargradient/g, 'linearGradient')
        .replace(/radialgradient/g, 'radialGradient')
        .replace(/clippath/g, 'clipPath')
        .replace(/patternunits/g, 'patternUnits')
        //fixes for wrong id naming
        .replace(/(id=")#/g, '$1')
        .replace(/(url\()##/g, '$1#')
        //anychart a11y
        .replace(/aria-label=".*?"/g, '')
}

function applyResourcesToDoc(params, resources, callback) {
    const document = params.document;
    const head = document.getElementsByTagName('head')[0];
    const window = document.defaultView;
    let scripts = '';

    for (let i = 0, len = resources.length; i < len; i++) {
        const resource = resources[i];
        const type = resource.type;

        if (type == mime.contentType('css')) {
            const style = document.createElement('style');
            style.innerHTML = resource.body;
            head.appendChild(style);

            //todo font loading
            // const font = new FontFaceObserver('Conv_interdex');
            // font.load().then(function () {
            //
            // });
        } else if (type == mime.contentType('js')) {
            scripts += ' ' + resource.body + ';';
        }
    }

    let err = null;
    try {
        const script = new vm.VM({
            timeout: 5000,
            sandbox: window
        });
        script.run(scripts);
    } catch (e) {
        console.log(e);
        err = e;
    }

    return callback(err, params);
}

function loadExternalResources(resources, params, callback) {
    if (Object.prototype.toString.call(resources) === '[object Array]') {
        const loadedResources = [];
        for (let i = 0, len = resources.length; i < len; i++) {
            request
                .get(resources[i], function (err, response, body) {
                    if (err) {
                        // @ts-ignore
                        loadedResources.push('');
                    } else {
                        // @ts-ignore
                        loadedResources.push({type: mime.contentType(response.headers['content-type']), body: body});
                    }

                    if (resources.length === loadedResources.length) {
                        return applyResourcesToDoc(params, loadedResources, callback);
                    }
                });
        }
        if (resources.length === loadedResources.length) {
            return applyResourcesToDoc(params, loadedResources, callback);
        }
    } else {
        return callback(null, params);
    }
}

function getSvgString(svgElement, width, height) {
    let svg = '';
    if (svgElement) {
        if (!width || isPercent(width))
            width = defaultBounds.width;
        if (!height || isPercent(height))
            height = defaultBounds.height;

        svgElement.setAttribute('width', width);
        svgElement.setAttribute('height', height);
        svg = xmlNs + svgElement.outerHTML;
    }
    return svg;
}

function getSvg(target, params, callback) {
    const dataType = params.dataType;

    if (dataType === 'svg') {
        return callback(null, fixSvg(target), params);
    } else {
        let svg
        let container
        let svgElement
        const res = params.resources;

        let isChart = dataType === 'chart';
        const isStage = dataType === 'stage';

        if (!params.document && !(isChart || isStage)) {
            params.iframeId = createSandbox(params.containerId);
            params.document = iframeDoc;
        }
        if (params.document)
            prepareDocumentForRender(params.document);

        return loadExternalResources(res, params, function (err, params) {
            const document = params.document;
            const window = document && document.defaultView;
            let bounds
            let width
            let height

            if (window) {
                anychart.global(window);
            }

            if (dataType === 'javascript') {
                const script = new vm.VM({timeout: 10000, sandbox: {anychart: window.anychart}});

                script.run(target);

                const svgElements = document.getElementsByTagName('svg');
                const chartToDispose = [];

                for (let i = 0, len = svgElements.length; i < len; i++) {
                    svgElement = svgElements[i];

                    if (!svgElement) {
                        continue;
                    }

                    const id = svgElement.getAttribute('ac-id');
                    const stage = anychart.graphics.getStage(id);

                    if (stage) {
                        const charts = stage.getCharts();

                        for (let chartId in charts) {
                            const chart = charts[chartId];
                            bounds = chart.bounds();
                            svg = getSvgString(svgElement, bounds.width(), bounds.height());
                            // @ts-ignore
                            chartToDispose.push(chart);
                        }

                        stage.dispose();
                    }
                }

                for (let i = 0, len = chartToDispose.length; i < len; i++) {
                    // @ts-ignore
                    chartToDispose[i].dispose();
                }
            } else {
                if (dataType === 'json') {
                    target = anychart.fromJson(target);
                    isChart = true;
                } else if (dataType === 'xml') {
                    target = anychart.fromXml(XMLparser.parseFromString(target));
                    isChart = true;
                }

                target.container(params.containerId);

                if (isChart || isStage) {
                    if (target.animation)
                        target.animation(false);
                    if (target.a11y)
                        target.a11y(false);

                    container = target.container();
                    if (!container) {
                        if (params.document) {
                            const div = params.document.createElement('div');
                            div.setAttribute('id', params.containerId);
                            params.document.body.appendChild(div);
                        } else if (isChart) {
                            //todo (blackart) for resolve this case need to add link to chart instance for parent anychart object. while it's not true will be used this approach.
                            params.iframeId = createSandbox(params.containerId);
                            params.document = iframeDoc;
                            prepareDocumentForRender(params.document);
                            anychart.global(params.document.defaultView);
                            target = anychart.fromJson(target.toJson());
                        } else {
                            console.warn('Warning! Cannot find context of executing. Please define \'document\' in exporting params.');
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
                    svg = getSvgString(svgElement, width, height);

                    if (dataType === 'json' && dataType === 'xml') {
                        target.dispose();
                    }
                } else {
                    console.warn('Warning! Wrong format of incoming data.');
                    svg = '';
                }
            }
            clearSandbox(params.iframeId);

            return callback(null, fixSvg(svg), params);
        });
    }
}

function getAvailableProcessesCount() {
    //nix way
    const procMetrics = execSync('ulimit -u && ps ax | wc -l').toString().trim().split(/\n\s+/g);
    // @ts-ignore
    return procMetrics[0] - procMetrics[1]
}

function workerForConverting(task, done) {
    if (isVectorFormat(task.params.outputType)) {
        let childProcess;
        let callBackAlreadyCalled = false;
        try {
            const params = ['-f', task.params.outputType];

            if (isDef(task.params.width)) {
                params.push('-w', task.params.width);
            }
            if (isDef(task.params.height)) {
                params.push('-h', task.params.height);
            }
            if (isDef(task.params['aspect-ratio']) && String(task.params['aspect-ratio']).toLowerCase() != 'false') {
                params.push('-a');
            }
            if (isDef(task.params.background)) {
                params.push('-b', task.params.background);
            }

            childProcess = spawn('rsvg-convert', params);
            let buffer;
            childProcess.stdout.on('data', function (data) {
                try {
                    const prevBufferLength = (buffer ? buffer.length : 0),
                        newBuffer = new Buffer(prevBufferLength + data.length);

                    if (buffer) {
                        buffer.copy(newBuffer, 0, 0);
                    }

                    data.copy(newBuffer, prevBufferLength, 0);

                    buffer = newBuffer;
                } catch (err) {
                    if (!callBackAlreadyCalled) {
                        done(err, null);
                        callBackAlreadyCalled = true;
                    }
                }
            });

            childProcess.on('close', function (code, signal) {
                if (!code && !callBackAlreadyCalled) {
                    done(null, buffer);
                } else {
                    console.warn('Unexpected close of child process with code %s signal %s', code, signal);
                }
            });

            childProcess.stderr.on('data', function (data) {
                if (!callBackAlreadyCalled) {
                    done(new Error(data), null);
                    callBackAlreadyCalled = true;
                }
            });

            childProcess.on('error', function (err) {
                if (err.code === 'ENOENT') {
                    console.warn('Warning! Please install librsvg package.');
                }
                if (!callBackAlreadyCalled) {
                    done(err, null);
                    callBackAlreadyCalled = true;
                }
            });

            childProcess.stdin.write(task.svg);
            childProcess.stdin.end();
        } catch (err) {
            if (!callBackAlreadyCalled) {
                done(err, null);
                callBackAlreadyCalled = true;
            }
        }
    } else {
        const img = gm(Buffer.from(task.svg, 'utf8'));
        applyImageParams(img, task.params);
        img.toBuffer(task.params.outputType, done);

        // const childProcess;
        // try {
        //   childProcess = spawn(isWin ? 'magick' : 'convert', ['svg:-', task.params.outputType + ':-']);
        //   const buffer;
        //   childProcess.stdout.on('data', function(data) {
        //     console.log('data');
        //     try {
        //       const prevBufferLength = (buffer ? buffer.length : 0),
        //           newBuffer = new Buffer(prevBufferLength + data.length);
        //
        //       if (buffer) {
        //         buffer.copy(newBuffer, 0, 0);
        //       }
        //
        //       data.copy(newBuffer, prevBufferLength, 0);
        //
        //       buffer = newBuffer;
        //     } catch (err) {
        //       done(err, null);
        //     }
        //   });
        //
        //   childProcess.on('close', function(code) {
        //     if (!code) {
        //       done(null, buffer);
        //     }
        //   });
        //
        //   childProcess.on('error', function(err) {
        //     if (err.code == 'ENOENT') {
        //       console.log('Warning! Please install imagemagick utility. (https://www.imagemagick.org/script/binary-releases.php)');
        //     }
        //     done(err, null);
        //   });
        //
        //   childProcess.stdin.write(task.svg);
        //   childProcess.stdin.end();
        // } catch (err) {
        //   done(err, null);
        // }
    }
}

function loadDefaultFontsSync() {
    const fontFilesList = fs.readdirSync(defaultFontsDir);

    for (let i = 0, len = fontFilesList.length; i < len; i++) {
        const fileName = fontFilesList[i];
        const font = opentype.loadSync(defaultFontsDir + '/' + fileName);
        fonts[font.names.fullName.en.toLowerCase()] = font;
    }

    return fonts;
}

function convertSvgToImageData(svg, params, callback) {
    convertQueue.push({svg: svg, params: params}, callback);
}

function convertSvgToImageDataSync(svg, params) {
    if (isVectorFormat(params.outputType)) {
        const convertParams = ['-f', params.outputType];
        if (isDef(params.width)) {
            convertParams.push('-w', params.width);
        }
        if (isDef(params.height)) {
            convertParams.push('-h', params.height);
        }
        if (isDef(params['aspect-ratio']) && String(params['aspect-ratio']).toLowerCase() !== 'false'){
            convertParams.push('-a');
        }
        if (isDef(params.background)) {
            convertParams.push('-b', params.background);
        }

        return spawnSync('rsvg-convert', convertParams, {input: svg}).stdout;

    } else {
        // convert = spawnSync(isWin ? 'magick' : 'convert', ['svg:-', params.outputType + ':-'], {input: svg});
        let done = false
        let data = null
        let error = null;

        const img = gm(Buffer.from(svg, 'utf8'));
        applyImageParams(img, params);
        img.toBuffer(params.outputType, function (err, buffer) {
            // @ts-ignore
            data = buffer;
            // @ts-ignore
            error = err;
            done = true;
        });
        deasync.loopWhile(function () {
            return !done;
        });
        return data;
    }
}

//endregion utils

//region --- API
const AnychartExport = function () {
};

AnychartExport.prototype.exportTo = function (target, options, callback) {
    if (!target) {
        console.warn('Can\'t read input data for exporting.');
    }

    const params = getParams(arguments);
    callback = params.callback;

    if (typeof callback === 'function') {
        try {
            getSvg(target, params, function (err, svg, params) {
                if (params.outputType === 'svg') {
                    process.nextTick(function () {
                        callback(err, svg);
                    });
                } else {
                    convertSvgToImageData(svg, params, callback);
                }
            });
        } catch (e) {
            callback(e, null);
            return;
        }
    } else {
        return new promiseLibrary(function (resolve, reject) {
            try {
                getSvg(target, params, function (err, svg, params) {
                    if (params.outputType === 'svg') {
                        process.nextTick(function () {
                            if (err) reject(err);
                            else resolve(svg);
                        });
                    } else {
                        const done = function (err, image) {
                            if (err) reject(err);
                            else resolve(image);
                        };
                        convertSvgToImageData(svg, params, done);
                    }
                })
            } catch (e) {
                reject(e);
                return;
            }
        })
    }
};

AnychartExport.prototype.exportToSync = function (target, options) {
    const params = getParams(arguments);
    return getSvg(target, params, function (err, svg, params) {
        return params.outputType === 'svg' ? svg : convertSvgToImageDataSync(svg, params);
    });
};

AnychartExport.prototype.loadFont = function (path, callback) {
    if (typeof callback == 'function') {
        opentype.load(path, function (err, font) {
            if (!err) {
                // @ts-ignore
                fonts[font.names.fullName.en.toLowerCase()] = font;
            }

            callback(err, font);
        });
    } else {
        return new promiseLibrary(function (resolve, reject) {
            opentype.load(path, function (err, font) {
                if (err) {
                    reject(err);
                } else {
                    // @ts-ignore
                    fonts[font.names.fullName.en.toLowerCase()] = font;
                    resolve(font);
                }
            });
        })
    }
};

AnychartExport.prototype.loadFontSync = function (path) {
    // @ts-ignore
    return fonts[font.names.fullName.en.toLowerCase()] = opentype.loadSync(path);
};

AnychartExport.prototype.anychartify = anychartify;

const AnychartExportWrapper = function (anychartInst) {
    if (anychartInst) {
        anychart = anychartInst;
        setAsRootDocument(anychart.global().document);
    }
    return new AnychartExport();
};

AnychartExportWrapper.exportTo = AnychartExport.prototype.exportTo;

AnychartExportWrapper.exportToSync = AnychartExport.prototype.exportToSync;

AnychartExportWrapper.loadFont = AnychartExport.prototype.loadFont;

AnychartExportWrapper.loadFontSync = AnychartExport.prototype.loadFontSync;

AnychartExportWrapper.anychartify = AnychartExport.prototype.anychartify;

//endregion

loadDefaultFontsSync();

module.exports = AnychartExportWrapper;
