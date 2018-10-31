function start_app () {

  // Just preparing HTML

  // Note: video src doesn't have to be webcam
  let el_video = document.getElementById('video');
  let el_canvas = document.getElementById('canvas');
  let el_diff = document.getElementById('diff');
  let el_diff_effect = document.getElementById('diff_effect');

  let w = window.innerWidth / 2;
  let h = window.innerHeight / 2;

  let scale = control.width / w;

  let w_diff = Math.floor( w * scale );
  let h_diff = Math.floor( h * scale );

  el_video.width = w;
  el_video.height = h;

  el_canvas.width = w_diff;
  el_canvas.height = h_diff;

  el_diff.width = w_diff;
  el_diff.height = h_diff;

  el_diff_effect.width = w_diff;
  el_diff_effect.height = h_diff;

  // Get canvas interface for drawing
  let ctx_normal = el_canvas.getContext('2d');
  let ctx_difference = el_diff.getContext('2d');
  let ctx_diff_effect = el_diff_effect.getContext('2d');

  let motion_pts = [];
  let convex_hull = [];


  // Start webcam stream
  navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { 
        width: w, 
        height: h
      }
    }).then( requested_stream => {
      stream = requested_stream;

      el_video.srcObject = stream;

      setInterval( render , control.interval);
    }).catch( error => {
      console.log(error);
    });

  function render () {
    ctx_difference.globalCompositeOperation = 'difference';
    ctx_difference.drawImage(el_video, 0, 0, w_diff, h_diff);

    let image = ctx_difference.getImageData(0, 0, w_diff, h_diff);

    ctx_diff_effect.putImageData(image, 0, 0);
      
      process_image(image);

      // Draw the processed image to the canvas (green image)
      ctx_normal.putImageData(image, 0, 0);

      // Is there enough data?
      let empty = (motion_pts.length < control.min_pts);

      if (!empty) {
        convex_hull = hull(motion_pts, control.concavity);
      }

      // Draw hull on top of green image
      ctx_normal.beginPath();
      ctx_normal.strokeStyle = "red";
      ctx_normal.moveTo(convex_hull[0][0], convex_hull[0][1]);
      for (let i = 1; i < convex_hull.length; i++) {
        ctx_normal.lineTo(convex_hull[i][0], convex_hull[i][1]);
      }
      ctx_normal.stroke();

      motion_pts.length = 0;

    // Prepare the canvas for next drawing loop
    // by drawing over with normal unprocessed image
    ctx_difference.globalCompositeOperation = 'source-over';
    ctx_difference.drawImage(el_video, 0, 0, w_diff, h_diff);
  }

  function process_image (image) {
    /*
      rgba = array of color values from 0-255 [ r, g, b, a ... ]
      p = pixel index, every 4 values is 1 pixel
      i = actual index
    */
    let rgba = image.data;
    let p = 0;
    let i = 0;

    for (i = 0; i < rgba.length; i += 4, p++) {
    
      let difference = (rgba[i] * control.r) + (rgba[i + 1] * control.g) + (rgba[i + 2] * control.b);
      
      let normalized = Math.min(255, difference * (255 / control.threshold));
      
      rgba[i] = 0;
      rgba[i + 1] = normalized;
      rgba[i + 2] = 0;

      // Add pixel position to array for creating hull
      if (difference > control.threshold) {
        motion_pts.push([
            p % w_diff,
            Math.floor(p / w_diff)
          ]);
      }
    }
  }
}