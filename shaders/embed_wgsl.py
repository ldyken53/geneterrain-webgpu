#!/usr/bin/env python3
shaders = [
    "compute_terrain.wgsl",
    "normalize_terrain.wgsl",
    "display_2d_vert.wgsl",
    "display_2d_frag.wgsl",
    "display_3d_vert.wgsl",
    "display_3d_frag.wgsl",
    "subtract_terrain.wgsl",
    "draw_lines_vert.wgsl",
    "draw_lines_frag.wgsl",
]
compiled_shaders = ""

for shader in shaders:
    with open(shader, "r") as f:
        compiled_code = f.read()
        compiled_shaders += f"const  {shader[:-5]} = `{compiled_code}`;\n"

with open("../js/wgsl.js", "w") as f:
    f.write(compiled_shaders)

