// ==UserScript==
// @name         Jigsaw Hint System
// @namespace    https://github.com/local/jigsaw-solver
// @version      1.0
// @description  provide visual hints for Jigsaw Explorer puzzle 
// @author       el 
// @run-at       document-idle
// @match        https://www.jigsawexplorer.com/online-jigsaw-puzzle-player.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    class HintPanel {
        constructor(root) {
            this.root = root; 
            this.element = null; 
            this.referenceImage = null; 
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

            panel.append(title); 

            const imageInput = this.root.createElement("input"); 
            imageInput.type = "file"; 
            imageInput.accept = "image/*"; 

            const preview = this.root.createElement("img"); 
            Object.assign(preview.style, {
                width: "100%", 
                marginTop: "10px"
            })

            imageInput.addEventListener("change", () => {
                const file = imageInput.files[0]; 
                if (!file) return; 

                const imageURL = URL.createObjectURL(file); 

                preview.onload = () => {
                    this.referenceImage = preview; 
                    URL.revokeObjectURL(imageURL); 
                }

                preview.src = imageURL;
            }); 

            panel.append(imageInput, preview)

            this.root.body.appendChild(panel); 

            this.element = panel; 
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
            Object.assign(this.handle.style, {
                cursor: "grab",
                touchAction: "none"
            });

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
                Object.assign(this.handle.style, {
                    cursor: "grabbing"
                });
            });

            // update panel pos while dragging 
            this.handle.addEventListener("pointermove", (event) => {
                if (!dragging) return;
                Object.assign(this.panel.style, {
                    right: "auto",
                    left: `${event.clientX - offsetX}px`,
                    top: `${event.clientY - offsetY}px`
                });
            });

            // stop dragging and restore cursor 
            const stopDragging = () => {
                dragging = false;
                Object.assign(this.handle.style, {
                    cursor: "grab"
                });
            };

            this.handle.addEventListener("pointerup", stopDragging);
            this.handle.addEventListener("pointercancel", stopDragging);
            this.handle.addEventListener("lostpointercapture", stopDragging);
        }
    }

    async function main() {

        const canvas = document.querySelector("#jigex-canvas");

        const hintPanel = new HintPanel(document); 
        hintPanel.mount(); 

        const { panel, handle } = hintPanel.getDragElements(); 

        const panelDragger = new PanelDragger(panel, handle); 
        panelDragger.attach(); 
    }

    main(); 
})();
