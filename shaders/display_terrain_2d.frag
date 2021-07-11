#version 450 core

// Input: fragment color
layout(location = 0) in vec4 frag_pos;

layout(set = 0, binding = 0) uniform texture2D colormap;
layout(set = 0, binding = 1) uniform sampler mySampler;
layout(set = 0, binding = 2, std430) buffer Pixels {
    float pixels[];
};

layout(location = 0) out vec4 color;


void main(void) {
    uint pixel_index = uint(frag_pos.x + 300 + frag_pos.y * 600);
    float value = pixels[pixel_index];

    color = vec4(textureLod(sampler2D(colormap, mySampler), vec2(value, 0.5), 0.f).rgb, 1);
}


