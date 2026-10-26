// ==UserScript==
// @name         Jigsaw Hint System
// @namespace    https://github.com/local/jigsaw-solver
// @version      1.0
// @description  provide visual hints for Jigsaw Explorer puzzle 
// @author       el 
// @match        https://www.jigsawexplorer.com/online-jigsaw-puzzle-player.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // find the canvas 
    class CanvasLocator {
        constructor(root, selector) {
            this.root = root; 
            this.selector = selector;   
        }

        // check for an existing canvas 
        find() {
            const element = this.root.querySelector(this.selector); 

            return element?.localName === "canvas"
                ? element
                : null; 
        }

        // observe page changes if the canvas hasnt appear
        // stops watching after finding it or reach timeout 
        waitForCanvas(timeoutMs = 15000) {

            // check whether the canvas alr exist 
            const existingCanvas = this.find(); 

            // canvas exist 
            if (existingCanvas) {
                return Promise.resolve(existingCanvas); 
            }

            // canvas doesnt exist 
            return new Promise((resolve, reject) => {

                // watch for changes to page elems 
                const observer = new MutationObserver(() => {
                    const canvas = this.find(); 

                    // canvas found, stop watching, cancel timeout 
                    if (canvas) {
                        cleanup(); 
                        resolve(canvas); 
                    }
                }); 

                // start a timer that limits the time we wait 
                const timeoutId = setTimeout(() => {
                    cleanup(); 

                    // fail Promise 
                    reject(
                        new Error(
                            `Canvas "${this.selector}" was not found.`
                        )
                    )
                }, timeoutMs);

                function cleanup() {
                    observer.disconnect(); 
                    clearTimeout(timeoutId); 
                }

                observer.observe(this.root, {
                    childList: true,
                    subtree: true
                }); 
            });
        }
    }

    async function main() {
        const canvasLocator = new CanvasLocator(
            document, 
            "#jigex-canvas"
        ); 

        try {
            const canvas = await canvasLocator.waitForCanvas(); 

            console.info("canvas found:", canvas); 
        } catch (error) {
            console.error("error:", error.message); 
        }
    }

    main(); 
})();
