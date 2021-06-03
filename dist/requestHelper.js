"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHeaders = exports.isValidUrl = exports.getPropertiesFromImg = exports.waitUntilOptions = exports.DEFAULT_Y = exports.DEFAULT_X = exports.DEFAULT_CROP = exports.DEFAULT_VIEWPORT = void 0;
const url_1 = require("url");
exports.DEFAULT_VIEWPORT = [800, 600];
exports.DEFAULT_CROP = [800, 600];
exports.DEFAULT_X = 1;
exports.DEFAULT_Y = 1;
exports.waitUntilOptions = ['networkidle2', 'networkidle0', 'domcontentloaded', 'load'];
const getPropertiesFromImg = ({ window, crop, x, y, waitUntil, jpegQuality }) => {
    if (window && !crop) {
        crop = window;
    }
    if (!crop) {
        [x, y] = ['0', '0'];
    }
    if (waitUntil) {
        waitUntil = exports.waitUntilOptions.find(opt => opt.toLowerCase() === waitUntil.toLowerCase());
    }
    else {
        waitUntil = 'networkidle2';
    }
    let [vpWidth, vpHeight] = window ? window.split('x').map(n => strictParseInt(n)) : exports.DEFAULT_VIEWPORT;
    if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight)) {
        [vpWidth, vpHeight] = exports.DEFAULT_VIEWPORT;
    }
    let [width, height] = crop ? crop.split('x').map(n => strictParseInt(n)) : exports.DEFAULT_CROP;
    if (!width || !isFinite(width) || !height || !isFinite(height)) {
        [width, height] = exports.DEFAULT_CROP;
    }
    const numX = x ? strictParseInt(x) : exports.DEFAULT_X;
    const numY = y ? strictParseInt(y) : exports.DEFAULT_Y;
    const jpegQualityNum = jpegQuality ? strictParseInt(jpegQuality) : undefined;
    return [
        { width: vpWidth, height: vpHeight },
        { clip: { width, height, x: numX, y: numY }, quality: jpegQualityNum, type: 'png' },
        waitUntil
    ];
};
exports.getPropertiesFromImg = getPropertiesFromImg;
// export const getPropertiesFromPdf = ({
//                                          format, waitUntil, window, scale, margin, printBackground,
//                                          landscape, displayHeaderFooter, path, pageRanges
//                                      }: Query) => {
//     const pdfFormat = format
//         ? pdfFormatOptions.find(opt => opt.toLowerCase() === (format as string).toLowerCase())
//         : undefined
//
//     waitUntil = waitUntil
//         ? waitUntilOptions.find(opt => opt.toLowerCase() === (waitUntil as string).toLowerCase())
//         : 'networkidle2'
//     let [vpWidth, vpHeight] = window ? window.split('x').map(n => strictParseInt(n)) : DEFAULT_VIEWPORT
//
//     if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
//         [vpWidth, vpHeight] = DEFAULT_VIEWPORT
//
//     //                      this is `any` because typescript doesn't have a type for NaN
//     let scaleNum = scale ? (Number(scale) as any | number) : undefined
//     if (isNaN(scaleNum)) scaleNum = undefined
//
//     // top:30;left:50%;right:60px;bottom:70 => { 'top': '30', 'left': '50%', 'right': '60px', 'bottom': '70' }
//     const marginObj = margin
//         ? margin.split(';')
//             .map(param => {
//                 const [key, value] = param.split(':')
//                 return key && value ? {[key]: value} : undefined
//             })
//             .filter(x => typeof x !== 'undefined')
//             .reduce((prev, cur) => {
//                 if (cur === undefined) return prev
//                 const key = Object.keys(cur)[0]
//
//                 return {
//                     ...prev,
//                     [key]: cur[key]
//                 }
//             }, {})
//         : undefined
//
//     const printBackgroundBool = printBackground
//         ? printBackground.toLowerCase() == 'true'
//         : undefined
//
//     const landscapeBool = landscape
//         ? landscape.toLowerCase() == 'true'
//         : undefined
//
//     const displayHeaderFooterBool = displayHeaderFooter
//         ? displayHeaderFooter.toLowerCase() == 'true'
//         : undefined
//
//     return [
//         {
//             width: vpWidth,
//             height: vpHeight
//         } as Viewport,
//         {
//             format: pdfFormat,
//             displayHeaderFooter: displayHeaderFooterBool,
//             landscape: landscapeBool,
//             printBackground: printBackgroundBool,
//             margin: marginObj as any, // dw about it typescript I got this :sweat_emoji:
//             path,
//             pageRanges,
//             scale: scaleNum
//         } as PDFOptions,
//         waitUntil as LoadEvent
//     ]
// }
const isValidUrl = (url) => {
    try {
        new url_1.URL(url);
        return true;
    }
    catch (e) {
        return false;
    }
};
exports.isValidUrl = isValidUrl;
const headersToIgnore = ['Host'];
/**
 * pass through cookies, auth, etc.
 * Using rawHeaders to ensure the values are strings
 * `req.headers` could have array values
 * Ex: [ 'headerKey', 'headerValue', ... ] => { 'headerKey': 'headerValue', ... }
 */
const transformHeaders = (rawHeaders) => rawHeaders.reduce((prev, cur, i, array) => i % 2 === 0 && !headersToIgnore.includes(cur)
    ? Object.assign(Object.assign({}, prev), { [cur]: array[i + 1] }) : prev, {});
exports.transformHeaders = transformHeaders;
const strictParseInt = (s) => 
// parseInt is not strict
parseInt(Number(s), 10);
