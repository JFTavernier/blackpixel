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
//					   Process Initialisation  
//-------------------------------------------------------------------

var u8ca;
var w=1920;
var h=1080;
var times = [];
var nbBlackPixels=0;

(function() {
	
    console.log("Initialisation " + w +"*" +h);

	var imageData = new ImageData(w,h);
    u8ca = imageData.data;

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

})();


//-------------------------------------------------------------------
//                  	Adding a Black Pixel 
//-------------------------------------------------------------------

function addBlackPx(){

	var x = Math.floor((Math.random() * w));
    var y = Math.floor((Math.random() * h));
	
	//console.log("Take Random " + x + y);

    var r = getClosestTransparentPx(x,y);

    console.log("Set black for x: " + r.x + " y:" + r.y + " i:"+r.i);
  	u8ca[r.i] = 255;
		
	chrome.storage.local.set(
		{
			px:{
				x:r.x,
				y:r.y
			}
		}
	); 
}

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


//-------------------------------------------------------------------
//                  Uint8ClampedArray Helper
//-------------------------------------------------------------------

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