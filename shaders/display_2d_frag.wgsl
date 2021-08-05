// Fragment shader
[[block]] struct Pixels {
    pixels : array<f32>;
};
[[block]] struct OverBool {
    checked : u32;
};

[[group(0), binding(0)]] var myTexture: texture_2d<f32>;
[[group(0), binding(1)]] var<storage, read> pixels : Pixels;
[[group(0), binding(2)]] var overlay : texture_2d<f32>;
[[group(0), binding(3)]] var<uniform> overlay_bool : OverBool;

[[stage(fragment)]]
fn main([[location(0)]] fragPosition: vec4<f32>) -> [[location(0)]] vec4<f32> {
    var ufragPos : vec4<u32> = vec4<u32>(fragPosition * 600.0);
    var pixelIndex : u32 = ufragPos.x + ufragPos.y * u32(600);
    var value : f32 = pixels.pixels[pixelIndex];
    var color : vec4<f32> = textureLoad(myTexture, vec2<i32>(i32(value * 180.0), 1), 0);
    if (overlay_bool.checked == u32(0)) {
        return color;
    }
    var overlay_color : vec4<f32> = textureLoad(overlay, vec2<i32>(i32(ufragPos.x), (600 - i32(ufragPos.y))), 0);
    if (overlay_color.w < 0.2) {
        return color;
    }
    return overlay_color;
}