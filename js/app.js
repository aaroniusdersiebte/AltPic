/* ============================================
   AltPic — App Logic
   ============================================ */

(() => {
  // ---- State ----
  let originalImage = null;
  let zoom = 1;
  let processing = false;
  let debounceTimer = null;

  const params = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    posterize: 32,
    sepia: 0,
    invert: 0,
    duotone: 0,
    duotoneColorA: '#000000',
    duotoneColorB: '#ffffff',
    ditherAlgo: 'none',
    ditherColors: 2,
    ditherStrength: 100,
    ditherPalette: 'bw',
    ditherBayerSize: 4,
    ditherSerpentine: false,
    ditherCustomColors: '#000000,#ffffff',
    ditherBlockSize: 1,
    asciiEnabled: false,
    asciiCharset: 'simple',
    asciiCustomChars: ' .:-=+*#%@',
    asciiCellSize: 8,
    asciiColorMode: 'mono',
    asciiColor: '#00ff00',
    asciiBg: '#000000',
    asciiEdges: false,
    asciiOverlay: false,
    asciiOverlayOpacity: 80,
    pixelate: 1,
    scanlines: 0,
    scanlineWidth: 2,
    halftone: 0,
    halftoneSize: 4,
    glitch: 0,
    dotMatrix: 0,
    dotMatrixSize: 8,
    dotMatrixShape: 'circle',
    dotMatrixBg: '#000000',
    dotMatrixLayout: 'grid',
    dotMatrixColorMode: 'original',
    dotMatrixColor: '#ffffff',
    dotMatrixInvert: false,
    dotMatrixSoft: false,
    dotMatrixGamma: 1.0
  };

  // ---- DOM Refs ----
  const $ = (sel) => document.querySelector(sel);
  const canvas = $('#canvas-preview');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const canvasAscii = $('#canvas-ascii');
  const fileInput = $('#file-input');
  const dropzone = $('#dropzone');
  const canvasWrapper = $('#canvas-wrapper');
  const canvasToolbar = $('#canvas-toolbar');
  const asciiOutput = $('#ascii-output');
  const zoomLabel = $('#zoom-level');

  // ---- File Upload ----

  $('#btn-upload').addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadImage(e.target.files[0]);
  });

  const canvasArea = $('#canvas-area');
  canvasArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  canvasArea.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  canvasArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
  });

  function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        dropzone.classList.add('hidden');
        canvasWrapper.classList.remove('hidden');
        canvasToolbar.classList.remove('hidden');
        fitToView();
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Zoom ----

  function fitToView() {
    if (!originalImage) return;
    const area = canvasArea.getBoundingClientRect();
    const pad = 48;
    const scaleX = (area.width - pad) / originalImage.width;
    const scaleY = (area.height - pad) / originalImage.height;
    zoom = Math.min(scaleX, scaleY, 1);
    updateZoomLabel();
  }

  function updateZoomLabel() {
    zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }

  $('#btn-zoom-in').addEventListener('click', () => {
    zoom = Math.min(zoom * 1.25, 5);
    updateZoomLabel();
    updateCanvasSize();
  });

  $('#btn-zoom-out').addEventListener('click', () => {
    zoom = Math.max(zoom / 1.25, 0.1);
    updateZoomLabel();
    updateCanvasSize();
  });

  $('#btn-fit').addEventListener('click', () => {
    fitToView();
    updateCanvasSize();
  });

  function updateCanvasSize() {
    if (!originalImage) return;
    const dispW = Math.round(originalImage.width * zoom);
    const dispH = Math.round(originalImage.height * zoom);
    canvas.style.width = dispW + 'px';
    canvas.style.height = dispH + 'px';
    // Match ASCII overlay canvas display size
    canvasAscii.style.width = dispW + 'px';
    canvasAscii.style.height = dispH + 'px';
  }

  // ---- Render Pipeline ----

  function render() {
    if (!originalImage || processing) return;
    processing = true;

    requestAnimationFrame(() => {
      const w = originalImage.width;
      const h = originalImage.height;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(originalImage, 0, 0);

      // 1. Basic adjustments
      const imageData = ctx.getImageData(0, 0, w, h);
      Effects.applyAdjustments(imageData, params);
      Effects.applyPosterize(imageData, params.posterize);
      Effects.applySepia(imageData, params.sepia);
      Effects.applyInvert(imageData, params.invert);
      Effects.applyDuotone(imageData, params.duotone, params.duotoneColorA, params.duotoneColorB);
      ctx.putImageData(imageData, 0, 0);

      // 2. Pixelate
      Effects.applyPixelate(ctx, w, h, params.pixelate);

      // 3. Dithering
      Effects.applyDithering(ctx, w, h, params);

      // 4. Scanlines
      Effects.applyScanlines(ctx, w, h, params.scanlines, params.scanlineWidth);

      // 5. Halftone
      Effects.applyHalftone(ctx, w, h, params.halftone, params.halftoneSize);

      // 6. Dot Matrix
      Effects.applyDotMatrix(ctx, w, h, params);

      // 7. Glitch
      Effects.applyGlitch(ctx, w, h, params.glitch);

      // 8. ASCII
      if (params.asciiEnabled) {
        if (params.asciiOverlay) {
          // Overlay mode: keep canvas visible, draw ASCII on top via canvas-ascii
          canvas.classList.remove('hidden');
          asciiOutput.classList.add('hidden');
          canvasAscii.classList.remove('hidden');
          renderAsciiOverlay(w, h);
        } else {
          // Classic mode: hide canvas, show pre element
          canvas.classList.add('hidden');
          asciiOutput.classList.remove('hidden');
          canvasAscii.classList.add('hidden');
          renderAscii(w, h);
        }
      } else {
        canvas.classList.remove('hidden');
        asciiOutput.classList.add('hidden');
        canvasAscii.classList.add('hidden');
      }

      updateCanvasSize();
      processing = false;
    });
  }

  function renderAscii(w, h) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(canvas, 0, 0);

    const result = Effects.generateAscii(tempCtx, w, h, params);

    asciiOutput.style.background = params.asciiBg;

    if (params.asciiColorMode === 'color') {
      let html = '';
      for (let row = 0; row < result.lines.length; row++) {
        for (let col = 0; col < result.lines[row].length; col++) {
          const [r, g, b] = result.colors[row][col];
          const ch = result.lines[row][col];
          if (ch === ' ') {
            html += ' ';
          } else {
            html += `<span style="color:rgb(${r},${g},${b})">${ch}</span>`;
          }
        }
        html += '\n';
      }
      asciiOutput.innerHTML = html;
    } else {
      asciiOutput.style.color = params.asciiColor;
      asciiOutput.textContent = result.text;
    }

    const cellSize = params.asciiCellSize;
    const fontSize = Math.max(3, Math.round(cellSize * zoom * 0.8));
    asciiOutput.style.fontSize = fontSize + 'px';
  }

  function renderAsciiOverlay(w, h) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(canvas, 0, 0);

    const result = Effects.generateAscii(tempCtx, w, h, params);
    Effects.renderAsciiToCanvas(canvasAscii, result, params);
  }

  // ---- Debounced Render ----

  function debouncedRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 30);
  }

  // ---- UI Bindings ----

  // Sliders
  document.querySelectorAll('input[type="range"][data-effect]').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.dataset.effect;
      const val = parseFloat(slider.value);
      params[key] = val;
      const display = slider.closest('.slider-row').querySelector('.slider-value');
      if (display) {
        display.textContent = key === 'hue' ? val + '°' : val;
      }
      debouncedRender();
    });
  });

  // Selects
  document.querySelectorAll('select[data-effect]').forEach(sel => {
    sel.addEventListener('change', () => {
      params[sel.dataset.effect] = sel.value;
      debouncedRender();
    });
  });

  // Color pickers
  document.querySelectorAll('input[type="color"][data-effect]').forEach(picker => {
    picker.addEventListener('input', () => {
      params[picker.dataset.effect] = picker.value;
      debouncedRender();
    });
  });

  // Checkboxes (toggles)
  document.querySelectorAll('input[type="checkbox"][data-effect]').forEach(cb => {
    cb.addEventListener('change', () => {
      params[cb.dataset.effect] = cb.checked;
      debouncedRender();
    });
  });

  // Text inputs
  document.querySelectorAll('input[type="text"][data-effect]').forEach(input => {
    input.addEventListener('input', () => {
      params[input.dataset.effect] = input.value;
      debouncedRender();
    });
  });

  // Textareas
  document.querySelectorAll('textarea[data-effect]').forEach(ta => {
    ta.addEventListener('input', () => {
      params[ta.dataset.effect] = ta.value;
      debouncedRender();
    });
  });

  // ---- Collapsible Groups ----

  document.querySelectorAll('.group-title[data-toggle]').forEach(title => {
    const target = document.getElementById(title.dataset.toggle);
    if (target && target.classList.contains('collapsed')) {
      title.classList.add('collapsed');
    }
    title.addEventListener('click', () => {
      title.classList.toggle('collapsed');
      target.classList.toggle('collapsed');
    });
  });

  // ---- Reset ----

  $('#btn-reset').addEventListener('click', () => {
    document.querySelectorAll('input[type="range"][data-effect]').forEach(slider => {
      const key = slider.dataset.effect;
      slider.value = slider.defaultValue;
      params[key] = parseFloat(slider.defaultValue);
      const display = slider.closest('.slider-row').querySelector('.slider-value');
      if (display) {
        display.textContent = key === 'hue' ? slider.defaultValue + '°' : slider.defaultValue;
      }
    });
    document.querySelectorAll('select[data-effect]').forEach(sel => {
      sel.selectedIndex = 0;
      params[sel.dataset.effect] = sel.value;
    });
    document.querySelectorAll('input[type="checkbox"][data-effect]').forEach(cb => {
      cb.checked = false;
      params[cb.dataset.effect] = false;
    });
    document.querySelectorAll('input[type="color"][data-effect]').forEach(picker => {
      picker.value = picker.defaultValue;
      params[picker.dataset.effect] = picker.defaultValue;
    });
    document.querySelectorAll('textarea[data-effect]').forEach(ta => {
      ta.value = ta.defaultValue;
      params[ta.dataset.effect] = ta.defaultValue;
    });
    debouncedRender();
  });

  // ---- Export ----

  $('#btn-export-png').addEventListener('click', () => {
    if (!originalImage) return;
    const link = document.createElement('a');
    link.download = 'altpic-export.png';

    if (params.asciiEnabled && !params.asciiOverlay) {
      exportAsciiAsImage(link);
    } else {
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  });

  function exportAsciiAsImage(link) {
    const expCanvas = document.createElement('canvas');
    const expCtx = expCanvas.getContext('2d');
    const text = asciiOutput.textContent;
    const lines = text.split('\n');
    const fontSize = 10;
    expCtx.font = `${fontSize}px Courier New`;
    const charW = expCtx.measureText('M').width;
    const maxCols = Math.max(...lines.map(l => l.length));

    expCanvas.width = Math.ceil(maxCols * charW) + 16;
    expCanvas.height = lines.length * fontSize + 16;

    expCtx.fillStyle = params.asciiBg;
    expCtx.fillRect(0, 0, expCanvas.width, expCanvas.height);
    expCtx.font = `${fontSize}px Courier New`;
    expCtx.fillStyle = params.asciiColor;

    lines.forEach((line, i) => {
      expCtx.fillText(line, 8, 8 + (i + 1) * fontSize);
    });

    link.href = expCanvas.toDataURL('image/png');
    link.click();
  }

  $('#btn-export-txt').addEventListener('click', () => {
    if (!originalImage) return;
    let text;
    if (params.asciiEnabled) {
      text = asciiOutput.textContent;
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalImage.width;
      tempCanvas.height = originalImage.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      tempCtx.drawImage(canvas, 0, 0);
      const result = Effects.generateAscii(tempCtx, originalImage.width, originalImage.height, params);
      text = result.text;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = 'altpic-export.txt';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  });

})();
