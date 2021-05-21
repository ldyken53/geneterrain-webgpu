#version 450 core

layout(location = 0) in vec4 pos;
layout(location = 1) in vec4 vcolor;

layout(location = 0) out vec4 fcolor;

// Our uniform buffer containing the projection * view matrix
layout(set = 0, binding = 0, std140) uniform ViewParams {
    mat4 proj_view;
};

void main(void) {
    fcolor = vcolor;
    gl_Position = proj_view * pos;
}