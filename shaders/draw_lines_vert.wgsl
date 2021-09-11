[[stage(vertex)]]
fn main([[builtin(vertex_index)]] VertexIndex: u32) -> [[builtin(position)]] vec4<f32> {
    var x : f32 = f32(VertexIndex) / 3.0 - 1.0;
    return vec4<f32>(x, 0.0, 0.0, 1.0);
}