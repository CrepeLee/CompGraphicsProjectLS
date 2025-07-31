#version 300 es

precision highp float;

in vec2 v_uv;

in vec3 v_worldSpacePosition;
in vec3 v_worldSpaceNormal;
in vec3 v_worldSpaceCameraPosition;

uniform sampler2D u_texture;

out vec4 outColor;



vec3 brdf(vec3 x, vec3 omega_i, vec3 omega_o, vec3 n, vec3 c_diffuse) {
	return c_diffuse + pow( max(dot(omega_o, -reflect(omega_i, n)), 0.0), 10.0);
}

// incoming spectral radiance (color and intensity) - directional light source
vec3 L_i_directional(vec3 x, vec3 omega_i) {
	return vec3(1);
}

float longitudeFromDirection(vec3 dir) {
	return atan(-dir.z, dir.x) + 3.141; // [0;2pi]
}

float latitudeFromDirection(vec3 dir) {
	return atan(dir.y, length(dir.xz));
}

vec2 sphereMapUV(vec3 position) {
	vec3 dir = normalize(position);
	float longitude = longitudeFromDirection(dir);
	float latitude = latitudeFromDirection(dir);

	float u = (longitude / 3.141) * 0.5; // [0;1]
	float v = (latitude / (3.141*0.5)) * 0.5 + 0.5; // [0;1]

	return vec2(u, v);
}

void main() {
	// balloon textures
//	vec3 c_diffuse = vec3(1.0, 0.44, 0.21);	// light brown
	vec3 c_diffuse = texture(u_texture, sphereMapUV(v_worldSpacePosition)).xyz;

	// position on surface
	vec3 x = v_worldSpacePosition;
	// surface normal direction
	vec3 n = normalize(v_worldSpaceNormal);
	// direction to camera
	vec3 omega_o = normalize(v_worldSpaceCameraPosition - x);
	// direction to light source
	vec3 omega_i = normalize(vec3(1,1,0));

	vec3 ambientLight = c_diffuse * 0.3;

	vec3 lighting = ambientLight;
	lighting += brdf(x, omega_i, omega_o, n, c_diffuse) * L_i_directional(x, omega_i) * max(0.0, dot(omega_i, n));

	outColor = vec4(lighting, 1.0);
}