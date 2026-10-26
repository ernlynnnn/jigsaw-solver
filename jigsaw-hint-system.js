// ==UserScript==
// @name         Jigsaw Hint System
// @namespace    https://github.com/local/jigsaw-solver
// @version      1.0
// @description  provide visual hints for Jigsaw Explorer puzzle 
// @author       el 
// @run-at       document-idle
// @match        https://www.jigsawexplorer.com/online-jigsaw-puzzle-player.html*
// @grant        none
// @require      https://docs.opencv.org/4.13.0/opencv.js
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
                display: "block",
                width: "100%",
                marginTop: "10px",
                marginBottom: "10px", 
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
                background: "rgba(20, 25, 35, 0.85)", 
                color: "white", 
                border: "1px solid black", 
                borderRadius: "10px", 
                font: "13px sans-serif", 
                zIndex: "2147483647"       // keep panel above selection overlay
            }); 

            const title = this.root.createElement("strong"); 
            title.textContent = "Jigsaw Hint System"; 

            Object.assign(title.style, {
                display: "block", 
                marginBottom: "10px"
            })

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

            const selectPiece = this.root.createElement("button"); 
            this.selectPiece = selectPiece;
            selectPiece.textContent = "Select Piece"; 

            Object.assign(selectPiece.style, {
                display: "block", 
                marginTop: "10px", 
            }); 
            
            panel.append(selectPiece)

            this.results = this.root.createElement("div");
            this.results.style.marginTop = "10px";

            this.selectedPreview = this.root.createElement("canvas");

            Object.assign(this.selectedPreview.style, {
                display: "block",
                width: "120px",
                height: "120px", 
                marginTop: "10px"
            });

            panel.append(this.selectedPreview);
            panel.append(this.results);


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
                lineWidth: 5
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

        // highlight top 3 matching cells
        showMatches(matches) {
            this.drawGrid();
    
            const canvas = this.preview;
            const ctx = canvas.getContext("2d");
    
            const cellWidth = canvas.width / this.cols;
            const cellHeight = canvas.height / this.rows;
            const colors = ["green", "yellow", "white"];
    
            matches.forEach((match, index) => {
                const x = (match.col - 1) * cellWidth;
                const y = (match.row - 1) * cellHeight;
    
                ctx.strokeStyle = colors[index];
                ctx.lineWidth = 12;
                ctx.strokeRect(x, y, cellWidth, cellHeight);
            });
    
            console.log("top 3 match:", matches);
    
            this.results.innerHTML = matches.map((match, index) => `
                <p>
                    ${index + 1}. row ${match.row}, column ${match.col}
                    (score: ${match.score.toFixed(3)})
                </p>
            `).join("");
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

    // select a puzzle piece by drawing a rectangle
    class PieceSelector {
        constructor(canvas, onSelect) {
            this.canvas = canvas;
            this.onSelect = onSelect;
            this.start = null;

            // create overlay
            this.overlay = document.createElement("canvas");

            Object.assign(this.overlay.style, {
                position: "fixed",
                zIndex: "2147483646",
                cursor: "crosshair",
                display: "none"
            });

            document.body.appendChild(this.overlay);

            const ctx = this.overlay.getContext("2d");

            // start selection
            this.overlay.addEventListener("pointerdown", (event) => {
                this.start = this.getPoint(event);
                this.overlay.setPointerCapture(event.pointerId);
            });

            // draw rectangle
            this.overlay.addEventListener("pointermove", (event) => {
                if (!this.start) return;

                const end = this.getPoint(event);

                ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

                Object.assign(ctx, {
                    strokeStyle: "yellow",
                    lineWidth: 2
                });

                ctx.strokeRect(
                    this.start.x,
                    this.start.y,
                    end.x - this.start.x,
                    end.y - this.start.y
                );
            });

            // finish selection
            this.overlay.addEventListener("pointerup", (event) => {
                if (!this.start) return;

                const end = this.getPoint(event);
                const start = this.start;

                this.start = null;

                Object.assign(this.overlay.style, {
                    display: "none"
                });

                this.onSelect({
                    u: Math.min(start.x, end.x) / this.overlay.width,
                    v: Math.min(start.y, end.y) / this.overlay.height,
                    width: Math.abs(end.x - start.x) / this.overlay.width,
                    height: Math.abs(end.y - start.y) / this.overlay.height
                });
            });
        }

        // show overlay on puzzle
        activate() {
            const rect = this.canvas.getBoundingClientRect();

            this.overlay.width = rect.width;
            this.overlay.height = rect.height;

            Object.assign(this.overlay.style, {
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                display: "block"
            });
        }

        // convert mouse position to canvas coordinates
        getPoint(event) {
            const rect = this.overlay.getBoundingClientRect();

            return {
                x: (event.clientX - rect.left) * this.overlay.width / rect.width,
                y: (event.clientY - rect.top) * this.overlay.height / rect.height
            };
        }
    }

    // crop selected piece from puzzle canvas
    function capturePiece(canvas, selection) {
        const piece = document.createElement("canvas");

        piece.width = Math.round(selection.width * canvas.width);
        piece.height = Math.round(selection.height * canvas.height);

        piece.getContext("2d").drawImage(
            canvas,
            selection.u * canvas.width,
            selection.v * canvas.height,
            selection.width * canvas.width,
            selection.height * canvas.height,
            0, 0, piece.width, piece.height
        );

        return piece;
    }

    // find the top 3 matching grid cells using OpenCV
    function matchPiece(piece, reference, rows, cols) {
        const matches = [];
        const size = 40;

        // resize selected piece
        const pieceMat = cv.imread(piece);
        const template = new cv.Mat();

        cv.resize(pieceMat, template, new cv.Size(size, size));

        // compare with each ref grid cell
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {

                const cell = document.createElement("canvas");
                cell.width = size;
                cell.height = size;

                // crop and resize reference cell
                cell.getContext("2d").drawImage(
                    reference,
                    col * reference.naturalWidth / cols,
                    row * reference.naturalHeight / rows,
                    reference.naturalWidth / cols,
                    reference.naturalHeight / rows,
                    0, 0, size, size
                );

                const cellMat = cv.imread(cell);
                const result = new cv.Mat();

                // calculate similarity
                cv.matchTemplate(cellMat, template, result, cv.TM_SQDIFF_NORMED);

                const score = 1 - cv.minMaxLoc(result).minVal;

                matches.push({
                    row: row + 1,
                    col: col + 1,
                    score
                });

                cellMat.delete();
                result.delete();
            }
        }

        pieceMat.delete();
        template.delete();

        // return the top 3 matches
        return matches.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    function main() {

        const canvas = document.querySelector("#jigex-canvas");

        const hintPanel = new HintPanel(document); 
        hintPanel.mount(); 

        const { panel, handle } = hintPanel.getDragElements(); 

        const panelDragger = new PanelDragger(panel, handle); 
        panelDragger.attach(); 

        if (!canvas) return; 

        const selector = new PieceSelector(canvas, (selection) => {
            const piece = capturePiece(canvas, selection);

            hintPanel.selectedPreview.width = piece.width;
            hintPanel.selectedPreview.height = piece.height;
            hintPanel.selectedPreview.getContext("2d").drawImage(piece, 0, 0);

            const matches = matchPiece(
                piece,
                hintPanel.referenceImage,
                hintPanel.rows,
                hintPanel.cols
            );

            hintPanel.showMatches(matches);
        });

        hintPanel.selectPiece.addEventListener("click", () => {
            selector.activate(); 
        });
    }

    main(); 
})();
