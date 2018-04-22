//====================================================================
//====================================================================
//
//                  	    Black Pixel
//
//====================================================================
//	- Author : Christina Twigg, Jeff Tavernier
//====================================================================


//-------------------------------------------------------------------
//						Chrome Tab Management 
//-------------------------------------------------------------------

//Insert script on tab updated 
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	console.log("Update Tab: " + tab.id);

	if(changeInfo.status == "complete"){

		//If activated start synchronise
		console.log("tab completed");
		chrome.tabs.executeScript(tab.id, {
			file:'script.js'
		},function(){
			console.log("script injected");
		});
	} else{
		console.log("tab loading");
	}
});

//Synchronise overlay on activated tab and stop synchro on other
chrome.tabs.onActivated.addListener(function (selectInfo){
	console.log("Activate Tab: " + selectInfo.tabId);

	//Synchronise the activated tab
	chrome.tabs.sendMessage(
		selectInfo.tabId,
		{method:"synchronise"}
	)

	//Stop synchronising unactive tab
	chrome.tabs.query({
		active:false,
		windowId:selectInfo.windowId
	},function(tabs){
		tabs.forEach(function(tab){
			chrome.tabs.sendMessage(
				tab.id,
				{method:"sleep"}
			)
		})
	})
});

//Sending the u8ca to the injected script when requested
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
	if(message == "u8ca"){
		console.log("u8ca Message Received, creating blob object url");
		var blob = new Blob([u8ca], { type: "octet/stream" });
		var url = window.URL.createObjectURL(blob);
		sendResponse({
			u8caURL:url
		});
	}
});

//-------------------------------------------------------------------
//						   Canvas Generation  
//-------------------------------------------------------------------

var canvas
var u8ca;
var ctx;
var w;
var h;
var times = [];
var nbBlackPixels=0;

(function() {
	
    //w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	//h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	
    w = 1920;
    h = 1080;
	
	console.log("Initialisation " + w +"*" +h);
    
	canvas = document.createElement('canvas');
	canvas.style.position = 'fixed';
	canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.width = w;
	canvas.height= h;
    canvas.style.backgroundColor = 'rgba(0,0,0,0)';
	canvas.style.zIndex = 10000;
	canvas.style.pointerEvents = "none";
    document.body.appendChild(canvas);
	
	ctx = canvas.getContext("2d");
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
	var imageData = ctx.getImageData(0,0,w,h);
    u8ca = imageData.data;

	//var limit = Math.floor(w*h*0.50);

    var interval = setInterval(function(){
    	if(nbBlackPixels == w*h){
    		console.log("completed")
    		clearInterval(interval);		
    	}
	   	else{
    		addBlackPx();
	    	nbBlackPixels++;
    	}
     },50);

    /*var j=0;
    var t0;
    var t1;
    for(var i =0;i<w*h;i++){
    	if(i == 0)
            var t0 = performance.now();
        
        /*if(i >=limit){
			if(i == limit)
				getAllTransparent();
			
			addBlackPx2();
        } else{

        	addBlackPx();
        //}          
        

        j++;

        if(j == 1000){
            j = 0;
             var t1 = performance.now();
    		 times.push(t1 - t0);
        }
    }*/

	
})();


//===================================================================
//
//                  	Business Logic 
//
//====================================================================



function addBlackPx(){

	var x = Math.floor((Math.random() * w));
    var y = Math.floor((Math.random() * h));
	
	//console.log("Take Random " + x + y);

    var r = getClosestTransparentPx(x,y);

    console.log("Set black for x: " + r.x + " y:" + r.y + " i:"+r.i);
  	u8ca[r.i] = 255;
	//ctx.fillRect(r.x,r.y,1,1);
	
	chrome.storage.local.set(
		{
			px:{
				x:r.x,
				y:r.y
			}
		}
	); 
}

function getAllTransparent(){
	u8ca.forEach(getIfTransparent);
}

// function addBlackPx2(){
// 	var i = Math.floor(Math.random()*transparentPx.length);
// 	var p = transparentPx[i];
// 	debugger
// 	transparentPx.splice(i,1);

	
// 	var r = getCoordinatesFromIndex(w,p);
// 	u8ca[p] = 255;
// 	ctx.fillRect(r.x,r.y,1,1);
// }

function getClosestTransparentPx(x,y){
	
	var startIndex = getPxAlphaIndexU8CA(w,x,y);
	var i;

	//console.log("Index" + startIndex);

	if(u8ca[startIndex] == 0){
		//console.log("Is not black");
		return {x:x,y:y,i:startIndex};
	}
		
	var found = false;	
	var endReached = false;
	var beginingReached = false;

	var rightIndex = startIndex + 4;
	var leftIndex = startIndex - 4;
	
	do{
		if(!beginingReached && leftIndex > 0){
			if(u8ca[leftIndex] == 0){
				found = true;
				i = leftIndex;
				break;
			}
		}else{
			beginingReached = true;
		}
		
		if(!endReached && rightIndex < u8ca.length){
			if(u8ca[rightIndex] == 0){
				found = true;
				i = rightIndex;
				break;
			}
		}else{
			endReached = true;
		}

		if(!endReached)
			rightIndex += 4;
		if(!beginingReached)
			leftIndex -= 4;

	}while(!found || (beginingReached && endReached))

	if(found){
		var r = getCoordinatesFromIndex(w,i);
		//console.log("Closest White found x: " + r.x + " y:" + r.y + " i:"+ i)
		return {x:r.x,y:r.y,i:i};
	}
	else
		return null;
}


//===================================================================
//
//                  Uint8ClampedArray Helper
//
//====================================================================

function getPxAlphaIndexU8CA(w,x,y){
	if(y>0)
		return (4*(x+1) + y*4*w)-1;
	else
		return (4*(x+1))-1;
}

function getCoordinatesFromIndex(w,i){
	
	if((i+1)%4 == 0){
		var p = (i+1)/4;
				
		if(p%w==0){
			y = (p/w)-1;
			x=w-1;
		}else{
			y=Math.floor(p/w);
			x=p -1 - y*w;
		}
		return {x:x,y:y};
	}
	return null;
}

function isPxBlackU8CA(w,x,y){
	return u8ca[getPxAlphaIndexU8CA(w,x,y)] == 255;
}

function getIfTransparent(element,index,array){
	if((index+1)%4 == 0 && element == 0)
		transparentPx.push(index);
}