// Fragment shader
#version 450 core

// Input: fragment color
layout(location = 0) in vec4 frag_pos;

// Output: fragment color
layout(location = 0) out vec4 color;

void main(void) {
    color = vec4(frag_pos.x, frag_pos.y, 0, 1);
}