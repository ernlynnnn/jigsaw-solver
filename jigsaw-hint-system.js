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
            this.rows = 3; 
            this.cols = 3; 
        }

        // create and display the panel 
        mount() {
            const panel = this.root.createElement("section");
            panel.id = "jigsaw-hint-panel"; 

            this.preview = this.root.createElement("canvas");

            Object.assign(this.preview.style, {
                width: "100%",
                marginTop: "10px",
                marginBottom: "10px", 
                display: "block"
            });

            

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
                font: "13px sans-serif", 
                zIndex: "99999999999"       // control which elem appears infront when overlap 
            }); 

            const title = this.root.createElement("strong"); 
            title.textContent = "Jigsaw Hint System"; 

            panel.append(title); 

            const imageInput = this.root.createElement("input"); 
            imageInput.type = "file"; 
            imageInput.accept = "image/*"; 

            imageInput.addEventListener("change", () => {
                const file = imageInput.files[0];
                if (!file) return;

                const imageURL = URL.createObjectURL(file);
                const image = new Image();

                image.onload = () => {
                    this.referenceImage = image;
                    this.drawGrid();

                    URL.revokeObjectURL(imageURL);
                };

                image.src = imageURL;
            });

            panel.append(imageInput, this.preview)

            // create rows and cols input 
            const rowsInput = this.root.createElement("input"); 
            const colsInput = this.root.createElement("input"); 

            rowsInput.type = colsInput.type = "number"; 
            rowsInput.value = this.rows; 
            colsInput.value = this.cols; 

            Object.assign(rowsInput.style, { width: "50px" });
            Object.assign(colsInput.style, { width: "50px" });

            // redraw grid when row or col changes 
            rowsInput.addEventListener("change", () => {
                this.rows = Math.max(1, Math.min(100, Number(rowsInput.value) || 3)); 
                this.drawGrid(); 
            })

            colsInput.addEventListener("change", () => {
                this.cols = Math.max(1, Math.min(100, Number(colsInput.value) || 3)); 
                this.drawGrid(); 
            })

            // add elems to panel 
            const rowsLabel = this.root.createElement("label"); 
            const colsLabel = this.root.createElement("label"); 

            rowsLabel.append("rows: ", rowsInput);
            colsLabel.append("cols: ", colsInput);

            panel.append(rowsLabel, colsLabel);

            this.root.body.appendChild(panel); 

            this.element = panel; 
        }

        // draw image w grid lines
        drawGrid() {
            if (!this.referenceImage) return;

            const canvas = this.preview;
            const ctx = canvas.getContext("2d");

            canvas.width = this.referenceImage.naturalWidth;
            canvas.height = this.referenceImage.naturalHeight;

            // redraw original image to clear previous grid lines
            ctx.drawImage(this.referenceImage, 0, 0);

            Object.assign(ctx, {
                strokeStyle: "red",
                lineWidth: 3
            });

            // draw vertical lines
            for (let col = 1; col < this.cols; col++) {
                const x = col * canvas.width / this.cols;

                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            // draw horizontal lines
            for (let row = 1; row < this.rows; row++) {
                const y = row * canvas.height / this.rows;

                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
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

    function main() {

        const canvas = document.querySelector("#jigex-canvas");

        const hintPanel = new HintPanel(document); 
        hintPanel.mount(); 

        const { panel, handle } = hintPanel.getDragElements(); 

        const panelDragger = new PanelDragger(panel, handle); 
        panelDragger.attach(); 
    }

    main(); 
})();
