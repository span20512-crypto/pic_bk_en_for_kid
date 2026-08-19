// 剔除参考素材上的第三方叠加物 —— 开发期工具，产物只进 media/（gitignore）
//
// 用法：
//   swift scripts/clean-media.swift <源mp4> <输出mp4> <上边界> <下边界> <模糊sigma> <左带止> <右带起> <码率>
//   实际使用（《很没耐心的毛毛虫》原片 720x1280）：
//   swift scripts/clean-media.swift media/x.orig.mp4 media/x.mp4 0.305 0.635 2.6 0.30 0.70 1400000
//
// 做两件事：
//   1) 裁掉画面区之外的一切 —— 顶部小红书条与推广横幅、底部烧录的中英字幕与引流条。
//      边界由逐帧抽样量得：本片纯画面区在全高的 30.5%~63.5%，裁后 720x422。
//   2) 对水印出没的左右边缘带做高斯模糊，使其不可辨读。
//      ⚠️ 水印无法真正剔除：它在左 6~32%、右 62~90% 之间游走且与主体重叠，
//      裁剪要裁到只剩中间 36% 才能避开；自动定位不可靠（半透明白字特征太弱）；
//      中值滤波保得住画面但消不掉。本机无 AI inpainting，模糊是当前可行解。
//
// 音轨原样转码保留（verbatim 模式用原声朗读，见 PRD §2.2）。

import Foundation
import AVFoundation
import CoreImage

// 用法: clean_final <src> <dst> <topPct> <botPct> <sigma> <leftEnd> <rightStart> <bitrate>
let src = URL(fileURLWithPath: CommandLine.arguments[1])
let dst = URL(fileURLWithPath: CommandLine.arguments[2])
let topPct = Double(CommandLine.arguments[3])!, botPct = Double(CommandLine.arguments[4])!
let sigma = Double(CommandLine.arguments[5])!
let lEnd = CGFloat(Double(CommandLine.arguments[6])!), rStart = CGFloat(Double(CommandLine.arguments[7])!)
let bitrate = Int(CommandLine.arguments[8])!

let asset = AVURLAsset(url: src)
guard let vTrack = asset.tracks(withMediaType: .video).first else { exit(1) }
let pref = vTrack.preferredTransform
let disp = vTrack.naturalSize.applying(pref)
let W = abs(disp.width), H = abs(disp.height)
var cropH = (H * botPct - H * topPct).rounded()
if Int(cropH) % 2 != 0 { cropH -= 1 }
// CoreImage 原点在左下：把“自顶向下的 topPct”换算成自底向上的 y
let ciBottom = H - (H * topPct).rounded() - cropH

let comp = AVMutableVideoComposition(asset: asset) { request in
    let full = request.sourceImage
    let cropRect = CGRect(x: 0, y: ciBottom, width: W, height: cropH)
    let cropped = full.cropped(to: cropRect)
        .transformed(by: CGAffineTransform(translationX: 0, y: -ciBottom))
    let ext = CGRect(x: 0, y: 0, width: W, height: cropH)
    var out = cropped
    if sigma > 0 {
        let blurred = cropped.clampedToExtent().applyingGaussianBlur(sigma: sigma).cropped(to: ext)
        let black = CIImage(color: .black).cropped(to: ext)
        let white = CIImage(color: .white)
        let l = white.cropped(to: CGRect(x: 0, y: 0, width: W * lEnd, height: cropH))
        let r = white.cropped(to: CGRect(x: W * rStart, y: 0, width: W * (1 - rStart), height: cropH))
        let mask = r.composited(over: l.composited(over: black))
        out = CIFilter(name: "CIBlendWithMask", parameters: [
            kCIInputImageKey: blurred, kCIInputBackgroundImageKey: cropped, kCIInputMaskImageKey: mask])!.outputImage!
    }
    request.finish(with: out.cropped(to: ext), context: nil)
}
comp.renderSize = CGSize(width: W, height: cropH)
comp.frameDuration = CMTime(value: 1, timescale: 30)

try? FileManager.default.removeItem(at: dst)
let reader = try! AVAssetReader(asset: asset)
let vOut = AVAssetReaderVideoCompositionOutput(videoTracks: asset.tracks(withMediaType: .video),
    videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
vOut.videoComposition = comp
reader.add(vOut)
var aOut: AVAssetReaderTrackOutput?
if let aT = asset.tracks(withMediaType: .audio).first {
    let o = AVAssetReaderTrackOutput(track: aT, outputSettings: [
        AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
    reader.add(o); aOut = o
}
let writer = try! AVAssetWriter(outputURL: dst, fileType: .mp4)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: Int(W), AVVideoHeightKey: Int(cropH),
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60]])
vIn.expectsMediaDataInRealTime = false
writer.add(vIn)
var aIn: AVAssetWriterInput?
if aOut != nil {
    let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2,
        AVSampleRateKey: 44100, AVEncoderBitRateKey: 96000])
    i.expectsMediaDataInRealTime = false; writer.add(i); aIn = i
}
writer.startWriting(); writer.startSession(atSourceTime: .zero); reader.startReading()
let grp = DispatchGroup()
grp.enter()
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
    while vIn.isReadyForMoreMediaData {
        if let sb = vOut.copyNextSampleBuffer() { vIn.append(sb) } else { vIn.markAsFinished(); grp.leave(); return }
    }
}
if let aIn = aIn, let aOut = aOut {
    grp.enter()
    aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
        while aIn.isReadyForMoreMediaData {
            if let sb = aOut.copyNextSampleBuffer() { aIn.append(sb) } else { aIn.markAsFinished(); grp.leave(); return }
        }
    }
}
grp.wait()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }; sem.wait()
if writer.status == .completed {
    let sz = ((try? FileManager.default.attributesOfItem(atPath: dst.path))?[.size] as? Int) ?? 0
    print("✓ \(Int(W))x\(Int(cropH))  \(sz/1024/1024)MB")
} else { print("✗ \(String(describing: writer.error))"); exit(1) }
