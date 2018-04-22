var canvas;
var ctx;

(function() {
    //console.log("Initialisation");
    chrome.runtime.onMessage.addListener(
        function(request,sender,sendResponse){
            //console.log("Receiving request")
            if(request.method == "synchronise"){
                //console.log("Synchronise");
                Start();
            }else if(request.method == "sleep"){
                //console.log("Sleep");
                Stop();
            }
        }
    );

    InsertCanvas();
})();

function InsertCanvas(){
    //console.log("Insert Canvas");

    canvas = document.createElement('canvas');
	canvas.style.position = 'fixed';
	canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.width = 1920;
	canvas.height= 1080;
    canvas.style.backgroundColor = 'rgba(0,0,0,0)';
	canvas.style.zIndex = 10000;
	canvas.style.pointerEvents = "none";
    
    ctx = canvas.getContext("2d");
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';

    loadImageDataFromBackground();
    document.body.appendChild(canvas);
}

function Stop(){
    //console.log("Stop Synchronisation");
    chrome.storage.onChanged.removeListener(newBlackPx);
}

function Start(){
    //console.log("Start Synchronisation");
    chrome.storage.onChanged.addListener(newBlackPx);
    loadImageDataFromBackground();
}

function loadImageDataFromBackground(){
    //console.log("Requesting u8ca from background");
    chrome.runtime.sendMessage("u8ca",function(response){
        //console.log("u8caURL received");
        var u8caUrl = response.u8caURL;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', u8caUrl, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function (e) {
            if (this.status == 200) {
                var buffer = this.response;
                var u8ca = new Uint8ClampedArray(buffer,0,buffer.byteLenght);
                var imageData = new ImageData(u8ca, 1920, 1080);
                //console.log("loading image from background")
                ctx.putImageData(imageData,0,0);
            }
        };
        xhr.send();
    });
}

function newBlackPx(changes,area){
    var x = changes["px"].newValue.x;
    var y = changes["px"].newValue.y;
    //console.log("Adding new Black Pixel: " + x + " " + y);
    ctx.fillRect(x,y,1,1);
}