// Fragment shader
#version 450 core

// Input: fragment color
layout(location = 0) in vec4 frag_pos;

// Output: fragment color
layout(location = 0) out vec4 color;

struct Node {
    float value;
    float x;
    float y;
    float size;
};

layout(set = 0, binding = 1, std430) buffer Nodes {
    Node nodes[];
};

layout(set = 0, binding = 2) uniform texture2D colormap;
layout(set = 0, binding = 3) uniform sampler mySampler;

void main(void) {
    float value = 0;
    for (int i = 0; i < 406; i++) {
        float sqrDistance = (frag_pos.x - nodes[i].x) * (frag_pos.x - nodes[i].x) + (frag_pos.y - nodes[i].y) * (frag_pos.y - nodes[i].y);
        value += nodes[i].value / (sqrDistance + 1.0);
    }
    value = (value+5)/10;
    color = vec4(textureLod(sampler2D(colormap, mySampler), vec2(value, 0.5), 0.f).rgb, 1);
}