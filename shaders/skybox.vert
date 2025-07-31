#version 300 es

// attribute data
in vec3 a_position;

out float v_height;

// uniform data
uniform mat4x4 u_modelMatrix;
uniform mat4x4 u_viewMatrix;
uniform mat4x4 u_projectionMatrix;

void main() {
	gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);

    v_height = a_position.y;
}
