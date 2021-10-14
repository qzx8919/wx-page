function Camera(video) {
    this.video = video;
}

Camera.prototype.init = function(onsuccess, onerror) {
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

Camera.prototype.open = function() {
    const video = this.video;
    function onsuccess(stream) {
        video.srcObject = stream;
        video.onerror = function(){
            stream.stop();
        }
        stream.onended = onerror
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

    this.init(onsuccess, onerror);
}