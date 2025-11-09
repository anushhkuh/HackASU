const video = document.getElementById("webcam");
const canvas = document.getElementById("output_canvas");
const ctx = canvas.getContext("2d");
const statusDiv = document.getElementById("status");
const API_URL = "http://127.0.0.1:5000/pose";

// Start webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            statusDiv.textContent = "✅ Camera ready";
            startDetection();
        };
    } catch (err) {
        console.error(err);
        statusDiv.textContent = `❌ Camera error: ${err.message}`;
    }
}

// Send frame to backend
async function sendFrameToBackend() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(video,0,0);
    const imageData = tempCanvas.toDataURL("image/jpeg",0.8);

    try {
        const res = await fetch(API_URL,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({image:imageData})
        });
        const data = await res.json();
        return data;
    } catch(err) {
        console.error(err);
        statusDiv.textContent = "❌ Backend connection failed";
        return {};
    }
}

// Draw pose points
function drawPoses(poses) {
    ctx.fillStyle="#00FF00";
    poses.forEach(pose => {
        pose.forEach(point=>{
            if(point){
                ctx.beginPath();
                ctx.arc(point[0],point[1],5,0,2*Math.PI);
                ctx.fill();
            }
        });
    });
}

// Main loop
async function startDetection(){
    async function processFrame(){
        const data = await sendFrameToBackend();
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(video,0,0,canvas.width,canvas.height);

        if(data.poses && data.poses.length>0){
            drawPoses(data.poses);
            statusDiv.textContent=`Focus: ${data.focus_status} | Posture: ${data.posture_feedback.join(", ")}`;
        }else{
            statusDiv.textContent="No person detected";
        }

        requestAnimationFrame(processFrame);
    }
    processFrame();
}

window.addEventListener("DOMContentLoaded", startWebcam);
