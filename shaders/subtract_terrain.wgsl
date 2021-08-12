// subtract terrain wgsl
[[block]] struct Uniforms {
  image_width : u32;
  image_height : u32;
  nodes_length : u32;
  width_factor : f32;
  view_box : vec4<f32>;
};
[[block]] struct Pixels {
    pixels : array<f32>;
};
[[block]] struct Range {
    x : atomic<i32>;
    y : atomic<i32>;
};

[[group(0), binding(0)]] var<uniform> uniforms : Uniforms;
[[group(0), binding(1)]] var<storage, write> pixelsA : Pixels;
[[group(0), binding(2)]] var<storage, write> pixelsB : Pixels;
[[group(0), binding(3)]] var<storage, write> pixelsC : Pixels;
[[group(0), binding(4)]] var<storage, read_write> range : Range;

[[stage(compute), workgroup_size(1, 1, 1)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
    var pixel_index : u32 = global_id.x + global_id.y * uniforms.image_width;
    var value : f32 = (10.0 * pixelsA.pixels[pixel_index]) - (10.0 * pixelsB.pixels[pixel_index]);
    ignore(atomicMin(&range.x, i32(floor(value))));
    ignore(atomicMax(&range.y, i32(ceil(value))));
    pixelsC.pixels[pixel_index] = value;
}