// ==UserScript==
// @name         Jigex preserveDrawingBuffer
// @namespace    https://github.com/local/jigsaw-solver
// @version      1.0
// @description  preserve drawing buffer helper 
// @match        https://www.jigsawexplorer.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const original = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function(type, options) {
        if (type?.toLowerCase().includes("webgl")) {
            options = { ...options, preserveDrawingBuffer: true };
        }

        return original.call(this, type, options);
    };
})();