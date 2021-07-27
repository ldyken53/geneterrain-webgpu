const  compute_terrain = `// compute terrain wgsl
struct Node {
    value : f32;
    x : f32;
    y : f32;
    size : f32;
};
[[block]] struct Nodes {
    nodes : array<Node>;
};
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

[[group(0), binding(0)]] var<storage, read> nodes : Nodes;
[[group(0), binding(1)]] var<uniform> uniforms : Uniforms;
[[group(0), binding(2)]] var<storage, write> pixels : Pixels;
[[group(0), binding(3)]] var<storage, read_write> range : Range;

[[stage(compute), workgroup_size(1, 1, 1)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
    var pixel_index : u32 = global_id.x + global_id.y * uniforms.image_width;
    var x : f32 = f32(global_id.x) / f32(uniforms.image_width);
    var y : f32 = f32(global_id.y) / f32(uniforms.image_height);
    x = x * (uniforms.view_box.z - uniforms.view_box.x) + uniforms.view_box.x;
    y = y * (uniforms.view_box.w - uniforms.view_box.y) + uniforms.view_box.y;
    var value : f32 = 0.0;

    for (var i : u32 = 0u; i < uniforms.nodes_length; i = i + 1u) {
        var sqrDistance : f32 = (x - nodes.nodes[i].x) * (x - nodes.nodes[i].x) + (y - nodes.nodes[i].y) * (y - nodes.nodes[i].y);
        value = value + nodes.nodes[i].value / (sqrDistance * uniforms.width_factor + 1.0);
    }
    ignore(atomicMin(&range.x, i32(floor(value))));
    ignore(atomicMax(&range.y, i32(ceil(value))));
    pixels.pixels[pixel_index] = value;
}`;
const  normalize_terrain = `// normalize terrain wgsl
[[block]] struct Uniforms {
  image_width : u32;
  image_height : u32;
  nodes_length : u32;
  width_factor : f32;
};
[[block]] struct Pixels {
    pixels : array<f32>;
};
[[block]] struct Range {
    x : i32;
    y : i32;
};

[[group(0), binding(0)]] var<storage, write> pixels : Pixels;
[[group(0), binding(1)]] var<uniform> uniforms : Uniforms;
[[group(0), binding(2)]] var<storage, read_write> range : Range;

[[stage(compute), workgroup_size(1, 1, 1)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
    var pixel_index : u32 = global_id.x + global_id.y * uniforms.image_width;
    pixels.pixels[pixel_index] = (pixels.pixels[pixel_index] - f32(range.x)) / f32(range.y - range.x);
}`;
const  display_2d_vert = `// Vertex shader
struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragPosition: vec4<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position : vec4<f32>)
     -> VertexOutput {
    var output : VertexOutput;
    output.Position = position;
    output.fragPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
    return output;
}


`;
const  display_2d_frag = `// Fragment shader
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

`;
