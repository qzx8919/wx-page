function Camera(el) {
  this.el = el
  this.video = null;
  this.mediaStream = null;
  this.canvas = null;
  this.isScanning = false;
  this.qrcode = null;
  this.init()
}

Camera.prototype.init = function() {
  this.canvas = createCanvasElement(400, 300);
  this.context = this.canvas.getContext("2d");
  this.el.appendChild(this.canvas);
  
  // this.qrcode = new Html5QrcodeShim();

}

Camera.prototype.scan = function(onsuccess, onerror) {
    // 调用浏览器API参数
    // const constrains = {
    //     video: {
    //       height: 800,
    //       facingMode: {
    //         // 强制后置摄像头
    //         exact: 'environment'
    //       }
    //     }
    //   };

    const constrains = { audio: false, video: true };
    

    // 老的浏览器可能根本没有实现 mediaDevices，所以我们可以先设置一个空的对象
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }

    // 一些浏览器部分支持 mediaDevices。我们不能直接给对象设置 getUserMedia
    // 因为这样可能会覆盖已有的属性。这里我们只会在没有getUserMedia属性的时候添加它。
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = function(constraints) {

        // 首先，如果有getUserMedia的话，就获得它
        var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        // 一些浏览器根本没实现它 - 那么就返回一个error到promise的reject来保持一个统一的接口
        if (!getUserMedia) {
          return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }

        // 否则，为老的navigator.getUserMedia方法包裹一个Promise
        return new Promise(function(resolve, reject) {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      }
    }
    navigator.mediaDevices.getUserMedia(constrains).then(onsuccess).catch(onerror);

}

Camera.prototype.open = function(qrCodeSuccessCallback, qrCodeErrorCallback) {
    const video = createVideoElement(400);
    this.el?.appendChild(video);
    this.video = video;
    const $this = this;
    function onsuccess(stream) {
        video.srcObject = stream;
        const onVideoError = () => {
          stream.stop();
        }
        $this.mediaStream = stream;
        stream.onended = onVideoError
        // Attach listeners to video.
        video.onabort = onVideoError;
        video.onerror = onVideoError;
        video.onplaying = () => {
             console.log('in the onplaying')
            // start scanning after video feed has started
            $this.foreverScan(
                qrCodeSuccessCallback,
                qrCodeErrorCallback);
            // resolve(/* void */ null);
        }

        video.onloadedmetadata = () => {
            if (stream.active) {
              video.play();
            } else {
              console.log('stream is not active ... ');
            }
        };
        
    }

    function onerror(err){
        console.log('error function ', err)
    }

    this.scan(onsuccess, onerror);
}

Camera.prototype.foreverScan = function(qrCodeSuccessCallback, qrCodeErrorCallback){
  if(this.video == null){
    return;
  }
  const video = this.video;
  const clientWidth = video.clientWidth;
  const clientHeight = video.clientHeight;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  console.log(' begin drawing the video image ... ', clientWidth, clientHeight, videoWidth, videoHeight );
  this.context.drawImage(video, 0, 0, videoWidth, videoWidth, 0, 0, clientWidth, clientHeight);

  const triggerNextScan = () => {
    this.foreverScanTimeout = setTimeout(() => {
        this.foreverScan(qrCodeSuccessCallback, qrCodeErrorCallback);
    }, getTimeoutFps(10));
  };

  this.scanContext(qrCodeSuccessCallback, qrCodeErrorCallback)
  .then((isSuccessfull) => {
    if(isSuccessfull){

    }else{
      triggerNextScan();
    }
  }).catch((error) => {
      console.log("Error happend while scanning context", error);
      triggerNextScan();
  });   

}

Camera.prototype.scanContext = function(qrCodeSuccessCallback, qrCodeErrorCallback){
  // return this.qrcode.decodeAsync(this.canvas).then((result) => {
  //     qrCodeSuccessCallback(result.text);
  //     return true;
  // }).catch((error) => {
  //     let errorMessage = `QR code parse error, error = ${error}`;
  //     qrCodeErrorCallback(errorMessage);
  //     return false;
  // });

  return Promise.reject();
}

Camera.prototype.close = function(){
  console.log("begin to close the camera .... ")
  if(this.foreverScanTimeout){
    clearTimeout(this.foreverScanTimeout);
    this.foreverScanTimeout = null;
  }
  const mediaStream = this.mediaStream;
  const tracksToClose = mediaStream && mediaStream.getVideoTracks().length || 0;
  var tracksClosed = 0;
  console.log(mediaStream, tracksToClose)

  const onAllTracksClosed = () => {
    this.el?.removeChild(this.video);
    this.mediaStream = null;
    this.video = null;
  }

  mediaStream && mediaStream.getVideoTracks().forEach((videoTrack) => {
    mediaStream.removeTrack(videoTrack);
    videoTrack.stop();
    ++tracksClosed;
    if (tracksClosed >= tracksToClose) {
        onAllTracksClosed();
    }
  });
}

function createVideoElement(width) {
  const videoElement = document.createElement("video");
  videoElement.style.width = `${width}px`;
  videoElement.muted = true;
  videoElement.setAttribute("muted", "true");
  videoElement.playsInline = true;
  return videoElement;
}

function createCanvasElement(width, height, customId) {
  const canvasWidth = width;
  const canvasHeight = height;
  const canvasElement = document.createElement("canvas");
  canvasElement.style.width = `${canvasWidth}px`;
  canvasElement.style.height = `${canvasHeight}px`;
  // canvasElement.style.display = "none";
  canvasElement.id = isNullOrUndefined(customId) ? "qr-canvas" : customId;
  return canvasElement;
}

function isNullOrUndefined(obj) {
  return (typeof obj === "undefined") || obj === null;
}

function getTimeoutFps(fps) {
  return 1000 / fps;
}