#!/usr/bin/env python3

import sys
import os
import subprocess

if len(sys.argv) != 2:
    print("Usage <glslc>")

glslc = sys.argv[1]
output = "embedded_shaders.js"
shaders = ["simple.vert", "simple.frag", "compute_terrain.comp", "display_terrain.vert", "display_terrain.frag", "normalize_terrain.comp"]

try:
    os.stat(output)
    os.remove(output)
except:
    pass

compiled_shaders = ""
for shader in shaders:
    print(shader)
    fname, ext = os.path.splitext(os.path.basename(shader))
    var_name ="{}_{}_spv".format(fname, ext[1:])
    print("Embedding {} as {}".format(shader, var_name))
    args = ["python", "compile_shader.py", glslc, shader, var_name]
    try:
        compiled_shaders += subprocess.check_output(args).decode("utf-8")
    except:
        print(f"Failed to compile {shader}")
        sys.exit(1)

with open(output, "w") as f:
    f.write(compiled_shaders)


