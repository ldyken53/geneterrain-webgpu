// Vertex shader
#version 450 core

// Inputs: position and color
layout(location = 0) in vec4 pos;

// Outputs: color passed to fragment shader
layout(location = 0) out vec4 frag_pos;

void main(void) {
    frag_pos = (pos + 1) * 300;
    gl_Position = pos;
}