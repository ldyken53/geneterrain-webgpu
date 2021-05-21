// Fragment shader
#version 450 core

// Input: fragment color
layout(location = 0) in vec4 fcolor;

// Output: fragment color
layout(location = 0) out vec4 color;

void main(void) {
    color = fcolor;
}