#version 450 core

layout(location = 0) in vec3 pos;

layout(location = 0) out vec3 vray_dir;
layout(location = 1) flat out vec3 transformed_eye;

layout(set = 0, binding = 0, std140) uniform ViewParams {
    mat4 proj_view;
    vec4 eye_pos;
};

void main(void) {
	vec3 volume_translation = vec3(0) - 0.5;
	gl_Position = proj_view * vec4(pos + volume_translation, 1);
	transformed_eye = eye_pos.xyz - volume_translation;
	vray_dir = pos - transformed_eye;
}
