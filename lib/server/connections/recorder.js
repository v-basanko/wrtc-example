'use strict';

const { PassThrough } = require('stream');

const { RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const { StreamInput } = require('fluent-ffmpeg-multistream');


const broadcast = (peerConnection)=>{
    //peerConnection.addEventListener('onaddstream',(data)=>{console.log('DATA:', data);});
    const audioTransceiver = peerConnection.addTransceiver('audio');
    const videoTransceiver = peerConnection.addTransceiver('video');
  
    const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
    const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

    const streams = [];
    videoSink.addEventListener('frame', ({ frame: { width, height, data }}) => {
        const size = `${width}x${height}`;
        if (!streams[0] || (streams[0] && streams[0].size !== size)) {

            const stream = {
                size,
                video: new PassThrough(),
                audio: new PassThrough()
            };

            const onAudioData = ({ samples: { buffer } }) => {
                if (!stream.end) {
                    stream.audio.push(Buffer.from(buffer));
                }
            };

            audioSink.addEventListener('data', onAudioData);

            stream.audio.on('end', () => {
                audioSink.removeEventListener('data', onAudioData);
            });

            streams.unshift(stream);

            streams.forEach(item=>{
                if (item !== stream && !item.end) {
                    item.end = true;
                    if (item.audio) {
                        item.audio.end();
                    }
                    item.video.end();
                }
            });
  
            stream.proc = ffmpeg()
                .addInput((new StreamInput(stream.video)).url)
                .addInputOptions([
                    '-f', 'rawvideo',
                    '-pix_fmt', 'yuv420p',
                    '-s:v', stream.size,
                    '-r', '30',                    
                ])
                .addInput((new StreamInput(stream.audio)).url)
                .addInputOptions([
                    '-f s16le',
                    '-ar 48k',
                    '-ac 1',
                ])
               // "ffmpeg", "-re", "-i", "pipe:0", "-c:v", "libx264", "-preset", "veryfast", "-maxrate", "3000k", "-bufsize", "6000k", "-pix_fmt", "yuv420p", "-g", "50", "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-ar", "44100", "-f", "flv", fmt.Sprintf("rtmp://live.twitch.tv/app/%s", streamKey
                .on('start', (data)=>{
                    console.log('Start recording >> ', data);
                })
                .on('end', (data)=>{
                    stream.recordEnd = true;
                    console.log('Stop recording >> ', data);
                })
                .on('error', (data)=>{
                    stream.recordEnd = true;
                    console.log('Error >> ', data);
                })
                .outputOptions([
                    "-c:v libx264",
                    '-preset veryfast',
                    '-tune zerolatency',
                    '-f flv',
                    "-c:a aac", 
                    "-b:a 160k", 
                    "-ac 2", 
                    "-ar 44100"
                ])
                .output('rtmp://media.viewpray.com:63101/live/testView');
            stream.proc.run();
        }

        streams[0].video.push(Buffer.from(data));
    });

    const { close } = peerConnection;
    peerConnection.close = function() {
        audioSink.stop();
        videoSink.stop();

        streams.forEach(({ audio, video, end, proc, recordPath })=>{
            if (!end) {
                if (audio) {
                    audio.end();
                }
                video.end();
            }
        });
        return close.apply(this, arguments);
    };
};

module.exports = broadcast;
