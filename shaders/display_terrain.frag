#version 450 core

layout(location = 0) in vec3 vray_dir;
layout(location = 1) flat in vec3 transformed_eye;

layout(set = 0, binding = 1) uniform texture2D colormap;
layout(set = 0, binding = 2) uniform sampler mySampler;
layout(set = 0, binding = 3, std430) buffer Pixels {
    float pixels[];
};

layout(location = 0) out vec4 color;


vec2 intersect_box(vec3 orig, vec3 dir, const vec3 box_min, const vec3 box_max) {
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}

bool outside_grid(const vec3 p, vec3 volumeDims) {
    return any(lessThan(p, vec3(0))) || any(greaterThanEqual(p, vec3(volumeDims)));
}

void main() {
    vec3 ray_dir = normalize(vray_dir);
    const vec3 volume_dims = vec3(600, 600, 600);
	const vec3 vol_eye = transformed_eye * volume_dims;
    const vec3 grid_ray_dir = normalize(ray_dir * volume_dims);

	vec2 t_hit = intersect_box(vol_eye, grid_ray_dir, vec3(0), volume_dims - 1);
	if (t_hit.x > t_hit.y) {
		discard;
	}

	t_hit.x = max(t_hit.x, 0.0);

	vec3 p = (vol_eye + t_hit.x * grid_ray_dir);
    p = clamp(p, vec3(0), vec3(volume_dims - 2));
    const vec3 inv_grid_ray_dir = 1.0 / grid_ray_dir;
    const vec3 start_cell = floor(p);
    const vec3 t_max_neg = (start_cell - vol_eye) * inv_grid_ray_dir;
    const vec3 t_max_pos = (start_cell + vec3(1) - vol_eye) * inv_grid_ray_dir;
    const bvec3 is_neg_dir = lessThan(grid_ray_dir, vec3(0));
    // Pick between positive/negative t_max based on the ray sign
    vec3 t_max = mix(t_max_pos, t_max_neg, is_neg_dir);
    const ivec3 grid_step = ivec3(sign(grid_ray_dir));
    // Note: each voxel is a 1^3 box on the grid
    const vec3 t_delta = abs(inv_grid_ray_dir);

    float t_prev = t_hit.x;
    // Traverse the grid 
    while (!outside_grid(p, volume_dims)) {
        const ivec3 v000 = ivec3(p);
        uint pixel_index = v000.x + v000.y * 600;
        float value = pixels[pixel_index] * 600;
        if (v000.z > 300) {
            if (value >= v000.z) {
                color = vec4(textureLod(sampler2D(colormap, mySampler), vec2(value / 600, 0.5), 0.f).rgb, 1);
                return;
            }
        } else if (v000.z < 300) {
            if (value <= v000.z) {
                color = vec4(textureLod(sampler2D(colormap, mySampler), vec2(value / 600, 0.5), 0.f).rgb, 1);
                return;
            }
        } else {
            color = vec4(textureLod(sampler2D(colormap, mySampler), vec2(value / 600, 0.5), 0.f).rgb, 1);
            return;
        }


        const float t_next = min(t_max.x, min(t_max.y, t_max.z));
        t_prev = t_next;
        // Advance in the grid
        if (t_next == t_max.x) {
            p.x += grid_step.x;
            t_max.x += t_delta.x;
        } else if (t_next == t_max.y) {
            p.y += grid_step.y;
            t_max.y += t_delta.y;
        } else {
            p.z += grid_step.z;
            t_max.z += t_delta.z;
        }
    }
}


