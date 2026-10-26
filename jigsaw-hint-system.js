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

    class HintPanel {
        constructor(root) {
            this.root = root; 
            this.element = null; 
            this.statusElement = null; 
        }

        // create and display the panel 
        mount() {
            // avoid duplicates 
            if (this.element) return; 

            const panel = this.root.createElement("section"); 
            panel.id = "jigsaw-hint-panel"; 

            // panel style 
            Object.assign(panel.style, {
                position: "fixed", 
                top: "12px", 
                right: "12px", 
                width: "285px", 
                maxHeight: "calc(100vh - 24px)", 
                overflowY: "auto", 
                boxSizing: "border-box", 
                padding: "12px", 
                background: "blue", 
                color: "white", 
                border: "1px solid black", 
                borderRadius: "10px", 
                font: "13px, sans-serif", 
                zIndex: "99999999999"       // control which elem appears infront when overlap 
            }); 

            const title = this.root.createElement("strong"); 
            title.textContent = "Jigsaw Hint System"; 

            const status = this.root.createElement("p"); 
            status.setAttribute("role", "status"); 

            panel.append(title, status); 
            this.root.body.appendChild(panel); 

            this.element = panel; 
            this.statusElement = status; 
        }

        // update message 
        setStatus(message) {
            if (this.statusElement) {
                this.statusElement.textContent = message; 
            }
        }

        getDragElements() {
            return {
                panel: this.element, 
                handle: this.element.querySelector("strong")
            }; 
        }
    }

    // allow hint panel to be dragged around 
    class PanelDragger {
        constructor(panel, handle) {
            this.panel = panel;
            this.handle = handle;
        }

        // attach pointer event listeners
        attach() {
            this.handle.style.cursor = "grab";
            this.handle.style.touchAction = "none";

            let offsetX = 0;
            let offsetY = 0;
            let dragging = false;

            // start dragging when user press the handle 
            this.handle.addEventListener("pointerdown", (event) => {
                if (event.button !== 0) return;

                dragging = true;

                // get panels current pos 
                const rect = this.panel.getBoundingClientRect();

                // calc where the pointer is relative to the panel 
                // prevent panel from jumping when dragging 
                offsetX = event.clientX - rect.left;
                offsetY = event.clientY - rect.top;

                this.handle.setPointerCapture(event.pointerId);
                this.handle.style.cursor = "grabbing";
            });

            // update panel pos while dragging 
            this.handle.addEventListener("pointermove", (event) => {
                if (!dragging) return;

                this.panel.style.right = "auto";

                this.panel.style.left =
                    `${event.clientX - offsetX}px`;

                this.panel.style.top =
                    `${event.clientY - offsetY}px`;
            });

            // stop dragging and restore cursor 
            const stopDragging = () => {
                dragging = false;
                this.handle.style.cursor = "grab";
            };

            this.handle.addEventListener("pointerup", stopDragging);
            this.handle.addEventListener("pointercancel", stopDragging);
            this.handle.addEventListener("lostpointercapture", stopDragging);
        }
    }

    async function main() {
        const canvasLocator = new CanvasLocator(
            document, 
            "#jigex-canvas"
        ); 

        const hintPanel = new HintPanel(document); 

        hintPanel.mount(); 

        const { panel, handle } = hintPanel.getDragElements(); 

        const panelDragger = new PanelDragger(panel, handle); 
        panelDragger.attach(); 

        hintPanel.setStatus("waiting for puzzle canvas..."); 

        try {
            const canvas = await canvasLocator.waitForCanvas(); 

            hintPanel.setStatus("puzzle canvas found"); 

            console.info("canvas found:", canvas); 
        } catch (error) {
            console.error("error:", error.message); 
        }
    }

    main(); 
})();
