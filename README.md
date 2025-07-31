# Project Features

My projects main feature is the `adjustable map generation` using perlin noise.
This works by generating a noise array, uploading it as attribute data and displacing the vertecies of the plane mesh by the noises values. The perlin noise had to be generated in the main.js since I wanted the map to change when a button is pressed and have it animate between the origin and a goal. This workes by setting a timestamp when the button is pressed as a starting point and changeing the noise attribute data over a certain time frame step by step until the noise goal is reached. 

To make the map look better I `simulated lighting by using the Rendering Equation` we learned about in exercise 07_lighting. This itself didnt work since the normals used for the weakening factor are the normals of a base plane. So new normals had to be calculated before making lighting work. I also added a fresnel function to the plane to make it look a bit better. 

The `balloon` was the second mesh I added. I noticed that adding every object per hand looked very unorganized so I added the objects javascript array to make adding more objects simpler. This did require generalizing most of the already existing code but made adding the quite literal skybox very easy and was a nice way to make searching around in my code a bit less annoying.

The balloon is `placed randomely in a certain range`. The height at wich the balloon appears changes as the amplitude of the terrain changes, this was added so the balloon would clip the mountains less often. I added the same height changes to the first person camera.   

The balloon also `loads with a texture`, for this I also used the characteristics of the objects array and just added a more generalized version of the code we used in exercise 08_texturing. Later I also added a texture to the map so the texture use is more obvious, I unfortunately really didn't like how the map looked with the textures I found so I added the 'use texture' checkmark to make its use optional.


## Interacting with the Scene

- The `First Person` and `Camera Pan` radio buttons configure in what perspective the scene is viewed.
- The `mapAplitude` slider sets the height for the mountains.
- The `mapFrequency` slider sets the mountain frequency, so how noisy the mountains are.
- The button `New Map` generates and morphs the current map to a new map. It also moves the balloon and the first person camera.  
- The `Use Texture` checkmark can be checked to make the map use a texture instead of the colors that change depending on height. (not recommended)

## External Resources

- The noise object used for generating a noise map is from [joeiddons](https://github.com/joeiddon/perlin.git) github.
- The function for the fresnel effect is from [godotshaders.com](https://godotshaders.com/snippet/fresnel/)
