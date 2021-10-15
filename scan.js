// import jsQR from 'jsqr';

function isNullOrUndefined(obj) {
  return typeof obj === 'undefined' || obj === null;
}

function createVideoElement(width) {
  const videoElement = document.createElement('video');
  videoElement.style.width = `${width}px`;
  videoElement.style.height = `100%`;
  videoElement.muted = true;
  videoElement.setAttribute('muted', 'true');
  videoElement.playsInline = true;
  videoElement.autoplay = true;
  return videoElement;
}

function createCanvasElement(width, height, customId) {
  const canvasElement = document.createElement('canvas');
  canvasElement.style.width = `${width}px`;
  canvasElement.style.height = `${height}px`;
  canvasElement.style.display = 'none';
  canvasElement.id = isNullOrUndefined(customId) ? 'qr-canvas' : customId;
  return canvasElement;
}

function getTimeoutFps(fps) {
  return 1000 / fps;
}

function Camera(el) {
  this.el = el;
  this.video = null;
  this.mediaStream = null;
  this.canvas = null;
  this.isScanning = false;
  this.qrcode = null;
  this.qrbox = {
    x: 0,
    y: 0,
    width: 250,
    height: 250
  };
  this.isQRboxEnable = false;

  this.init();
}

Camera.prototype.init = function () {
  const wrapWidth = this.el.clientWidth;
  console.log(wrapWidth);
  this.wrapWidth = wrapWidth;
  console.log(this.qrbox);

  this.canvas = createCanvasElement(this.qrbox.width, this.qrbox.height);
  this.context = this.canvas.getContext('2d');
  this.context.canvas.width = this.qrbox.width;
  this.context.canvas.height = this.qrbox.height;
  this.el.appendChild(this.canvas);
};

Camera.prototype.qrScanRegion = function (width, height) {
  const qrbox = this.qrbox;
  console.log('before set qr box ...', width, height);
  if (width - qrbox.width < 1 || height - qrbox.height < 1) {
    return;
  }
  const shadingElement = document.createElement('div');
  shadingElement.className = 'scan-area';
  shadingElement.innerHTML = `<div class="mark top-left"></div>
        <div class="mark top-right"></div>
        <div class="mark bottom-left"></div>
        <div class="mark bottom-right"></div>`;

  const rightLeftBorderSize = (width - qrbox.width) / 2;
  const topBottomBorderSize = (height - qrbox.height) / 2;
  shadingElement.style.cssText = `position: absolute ;
      left: ${rightLeftBorderSize}px; top: ${topBottomBorderSize}px;
      width: ${qrbox.width}px; height: ${qrbox.height}px; `;
  console.log('set the qrbox ...');
  this.el.appendChild(shadingElement);
};

Camera.prototype.scan = function (onsuccess, onerror) {
  // 调用浏览器API参数
  // const constrains = {
  //   video: {
  //     height: 800,
  //     facingMode: {
  //       // 强制后置摄像头
  //       exact: 'environment'
  //     }
  //   }
  // };

  const constrains = {
    audio: false,
    video: {
      height: 800
    }
  };

  // 老的浏览器可能根本没有实现 mediaDevices，所以我们可以先设置一个空的对象
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // 一些浏览器部分支持 mediaDevices。我们不能直接给对象设置 getUserMedia
  // 因为这样可能会覆盖已有的属性。这里我们只会在没有getUserMedia属性的时候添加它。
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      // 首先，如果有getUserMedia的话，就获得它
      const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      // 一些浏览器根本没实现它 - 那么就返回一个error到promise的reject来保持一个统一的接口
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // 否则，为老的navigator.getUserMedia方法包裹一个Promise
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
  navigator.mediaDevices.getUserMedia(constrains).then(onsuccess).catch(onerror);
};

Camera.prototype.start = function (qrCodeSuccessCallback, qrCodeErrorCallback) {
  const wrapWidth = this.wrapWidth || 400;
  const video = createVideoElement(wrapWidth);
  this.el?.appendChild(video);
  this.video = video;

  const onsuccess = (stream) => {
    video.srcObject = stream;
    const onVideoError = () => {
      stream.stop();
    };
    this.mediaStream = stream;
    stream.onended = onVideoError;
    // Attach listeners to video.
    video.onabort = onVideoError;
    video.onerror = onVideoError;
    video.onplaying = () => {
      console.log('in the onplaying');
      const videoWidth = video.clientWidth;
      const videoHeight = video.clientHeight;
      if (this.isQRboxEnable) {
        this.qrbox.x = (videoWidth - this.qrbox.width) / 2;
        this.qrbox.y = (videoHeight - this.qrbox.height) / 2;
      } else {
        this.context.canvas.width = videoWidth;
        this.context.canvas.height = videoHeight;
        this.qrbox.width = videoWidth;
        this.qrbox.height = videoHeight;
      }
      this.qrScanRegion(videoWidth, videoHeight);
      // start scanning after video feed has started
      this.foreverScan(qrCodeSuccessCallback, qrCodeErrorCallback);
      // resolve(/* void */ null);
    };

    video.onloadedmetadata = () => {
      if (stream.active) {
        video.play();
      } else {
        console.log('stream is not active ... ');
      }
    };
  };

  const onerror = (err) => {
    console.log('error function ', err);
  };

  this.scan(onsuccess, onerror);
};

Camera.prototype.foreverScan = function (qrCodeSuccessCallback, qrCodeErrorCallback) {
  if (this.video == null) {
    return;
  }

  // There is difference in size of rendered video and one that is
  // considered by the canvas. Need to account for scaling factor.
  const videoElement = this.video;
  const widthRatio = videoElement.videoWidth / videoElement.clientWidth;
  const heightRatio = videoElement.videoHeight / videoElement.clientHeight;

  const qrbox = this.qrbox;

  if (!qrbox) {
    throw 'qrRegion undefined when localMediaStream is ready.';
  }
  const sWidthOffset = qrbox.width * widthRatio;
  const sHeightOffset = qrbox.height * heightRatio;
  const sxOffset = qrbox.x * widthRatio;
  const syOffset = qrbox.y * heightRatio;

  console.log(
    'canvas drawing image ',
    qrbox.width,
    qrbox.height,
    videoElement.videoWidth,
    videoElement.videoHeight
  );

  const ctx = this.context;
  // Only decode the relevant area, ignore the shaded area,
  // More reference:
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  ctx.drawImage(
    videoElement,
    /* sx= */ sxOffset,
    /* sy= */ syOffset,
    /* sWidth= */ sWidthOffset,
    /* sHeight= */ sHeightOffset,
    /* dx= */ 0,
    /* dy= */ 0,
    /* dWidth= */ qrbox.width,
    /* dHeight= */ qrbox.height
  );

  const triggerNextScan = () => {
    this.foreverScanTimeout = setTimeout(() => {
      this.foreverScan(qrCodeSuccessCallback, qrCodeErrorCallback);
    }, getTimeoutFps(10));
  };

  // 扫码二维码
  // const imageData = ctx.getImageData(0, 0, qrbox.width, qrbox.height);
  // const code = jsQR(imageData.data, qrbox.width, qrbox.height, {
  //   inversionAttempts: 'dontInvert'
  // });
  // if (code) {
  //   console.log('sucess full to scan code ... ', code);
  //   qrCodeSuccessCallback && qrCodeSuccessCallback(code);
  //   clearTimeout(this.foreverScanTimeout);
  // } else {
  //   console.log(' scan QR code ...');
  //   triggerNextScan();
  // }

  triggerNextScan();
};

Camera.prototype.stop = function () {
  console.log('begin to close the camera .... ');
  if (this.foreverScanTimeout) {
    clearTimeout(this.foreverScanTimeout);
    this.foreverScanTimeout = null;
  }
  const mediaStream = this.mediaStream;
  const tracksToClose = (mediaStream && mediaStream.getVideoTracks().length) || 0;
  let tracksClosed = 0;
  console.log(mediaStream, tracksToClose);

  const onAllTracksClosed = () => {
    this.el?.removeChild(this.video);
    this.mediaStream = null;
    this.video = null;
  };

  mediaStream &&
    mediaStream.getVideoTracks().forEach((videoTrack) => {
      mediaStream.removeTrack(videoTrack);
      videoTrack.stop();
      ++tracksClosed;
      if (tracksClosed >= tracksToClose) {
        onAllTracksClosed();
      }
    });
};

// export default Camera;
