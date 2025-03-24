import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
//non-draggable model
export function loadStaticModel(modelPath,scene){
    loader.load( modelPath, function ( gltf ) {
        scene.add(gltf.scene);
    }, undefined, function ( error ) {
        console.error( error );
    } );
}

export function loadStaticObject(modelPath,modelObject,scene){
    loader.load( modelPath, function ( gltf ) {
        modelObject.add(gltf.scene);
        scene.add(modelObject);
    }, undefined, function ( error ) {
        console.error( error );
    } );
}
//draggable model
export function loadDraggableModel(modelPath, modelObject ,modelName,objectsList){
    loader.load( modelPath, function ( gltf ) {
        //camera = gltf.cameras[0];
        modelObject.add(gltf.scene);
        modelObject.name = modelName
        objectsList.add(modelObject);
    }, undefined, function ( error ) {
        console.error( error );
    } );
}