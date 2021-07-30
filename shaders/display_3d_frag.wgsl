// Fragment shader
[[block]] struct Pixels {
    pixels : array<f32>;
};
[[block]] struct Image {
    width : u32;
    height : u32;
};

[[group(0), binding(1)]] var colormap: texture_2d<f32>;
[[group(0), binding(2)]] var<storage, read> pixels : Pixels;
[[group(0), binding(3)]] var<uniform> image_size : Image;

fn intersect_box(orig : vec3<f32>, dir : vec3<f32>, box_min : vec3<f32>, box_max : vec3<f32>) -> vec2<f32> {
    let inv_dir : vec3<f32> = 1.0 / dir;
    let tmin_tmp : vec3<f32> = (box_min - orig) * inv_dir;
    let tmax_tmp : vec3<f32> = (box_max - orig) * inv_dir;
    var tmin : vec3<f32> = min(tmin_tmp, tmax_tmp);
    var tmax : vec3<f32> = max(tmin_tmp, tmax_tmp);
    var t0 : f32 = max(tmin.x, max(tmin.y, tmin.z));
    var t1 : f32 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2<f32>(t0, t1);
}

fn outside_grid(p : vec3<f32>, volumeDims : vec3<f32>) -> bool {
    return any(p < vec3<f32>(0.0)) || any(p >= volumeDims);
}

[[stage(fragment)]]
fn main(
  [[location(0)]] vray_dir: vec3<f32>, 
  [[location(1), interpolate(flat)]] transformed_eye : vec3<f32>
)-> [[location(0)]] vec4<f32> {
    var color : vec4<f32> = vec4<f32>(0.0);
    return color;
}

