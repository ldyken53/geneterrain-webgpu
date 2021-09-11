// marching square wgsl
[[block]] struct Uniforms {
    isovalue : f32;
    image_width : u32;
};
[[block]] struct Terrain {
    values : array<f32>;
};
[[block]] struct Vertices {
    values : array<f32>;
}

[[group(0), binding(0)]] var<uniform> uniforms : Uniforms;
[[group(0), binding(1)]] var<storage, read> terrain : Terrain;
[[group(0), binding(2)]] var<storage, read> vertices : Vertices;


[[stage(compute), workgroup_size(1, 1, 1)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
    var pixel_index : u32 = global_id.x + global_id.y * uniforms.image_width;
    var corner_vals : vec4<f32> = vec4<f32>(
        terrain.values[global_id.x + global_id.y * uniforms.image_width], 
        terrain.values[1 + global_id.x + global_id.y * uniforms.image_width], 
        terrain.values[global_id.x + (1 + global_id.y) * uniforms.image_width], 
        terrain.values[1 + global_id.x + (1 + global_id.y) * uniforms.image_width]
    );
    // Find marching squares case by moving clockwise from top left corner
    var square_case : u32 = 0;
    if (corner_vals.x >= isovalue) {square_case = square_case + 8;}
    if (corner_vals.y >= isovalue) {square_case = square_case + 4;}
    if (corner_vals.w >= isovalue) {square_case = square_case + 2;}
    if (corner_vals.z >= isovalue) {square_case = square_case + 1;}
    switch(square_case) {
        case 0: {
            return;
        } case 1: {
            vertices.values[pixel_index * 8] =  
        }

    }
}