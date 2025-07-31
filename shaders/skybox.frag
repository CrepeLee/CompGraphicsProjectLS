#version 300 es

precision highp float;

in float v_height;

out vec4 outColor;

void main() {
    outColor = vec4(0.39 + (1.0-v_height)*.3, 0.78 + (1.0-v_height)*.3, 1.0 + (1.0-v_height)*.3, 1.0);
}