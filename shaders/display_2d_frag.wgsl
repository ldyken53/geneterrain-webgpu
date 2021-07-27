// Fragment shader
[[block]] struct Pixels {
    pixels : array<f32>;
};

[[group(0), binding(0)]] var myTexture: texture_2d<f32>;
[[group(0), binding(1)]] var<storage, read> pixels : Pixels;

[[stage(fragment)]]
fn main([[location(0)]] fragPosition: vec4<f32>) -> [[location(0)]] vec4<f32> {
    var ufragPos : vec4<u32> = vec4<u32>(fragPosition * 600.0);
    var pixelIndex : u32 = ufragPos.x + ufragPos.y * u32(600);
    var value : f32 = pixels.pixels[pixelIndex];
    return textureLoad(myTexture, vec2<i32>(i32(value * 180.0), 1), 0);
}

