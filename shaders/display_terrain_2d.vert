// Vertex shader
#version 450 core

// Inputs: position and color
layout(location = 0) in vec4 pos;

// Outputs: color passed to fragment shader
layout(location = 0) out vec4 frag_pos;

layout(set = 0, binding = 3) uniform Translation {
    vec2 translation;
};

void main(void) {
    // frag_pos = (((pos + 1) / 2) + vec4(translation.x, translation.y, 0, 0)) * 600;
    frag_pos = (pos + 1) * 300;
    gl_Position = pos;
}