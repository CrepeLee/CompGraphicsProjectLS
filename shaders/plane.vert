#version 300 es

// attribute data
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in float a_noise;

// varying data
out vec2 v_uv;
out float v_noise;

out vec3 v_worldSpaceNormal;
out vec3 v_worldSpacePosition;
out vec3 v_worldSpaceCameraPosition;


uniform mat4x4 u_modelMatrix;
uniform mat4x4 u_viewMatrix;
uniform mat4x4 u_projectionMatrix;

void main() {
	vec3 modified_position = a_position;
	modified_position.y = a_noise;

	gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(modified_position, 1.0);
	
	
	// varying data
	v_uv = a_uv;
	v_noise = a_noise;

	v_worldSpaceNormal = (u_modelMatrix * vec4(a_normal, 0.0)).xyz;
	v_worldSpacePosition = (u_modelMatrix * vec4(modified_position, 1.0)).xyz;
	v_worldSpaceCameraPosition = (inverse(u_viewMatrix) * vec4(0,0,0,1)).xyz;
}
