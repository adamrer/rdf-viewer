// definitions for VSCode type hinting
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1} PluginV1 */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1InstanceContext} PluginV1InstanceContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1CompatibilityContext} PluginV1CompatibilityContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').LabeledPlugin} LabeledPlugin */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1Instance} PluginV1Instance */
/** @typedef {string} IRI */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginModule.registerPlugins} */

/**
 * Registers image plugin for image resources.
 * @returns {LabeledPlugin[]}
 */
export function registerPlugins() {
  return [
    {
      label: { en: "Image Plugin", cs: "Obrázek" },
      v1: createImagePlugin(),
    },
  ];
}

const IANA_TYPES = "http://www.w3.org/ns/iana/media-types/";
const IMAGE = IANA_TYPES + "image/";
const image = {
  jpeg: IMAGE + "jpeg#Resource",
  png: IMAGE + "png#Resource",
  apng: IMAGE + "apng#Resource",
  svg: IMAGE + "svg#Resource",
  gif: IMAGE + "gif#Resource",
};

/**
 * Logic for the image plugin.
 * @returns {PluginV1}
 */
function createImagePlugin() {
  return {
    priority: 100,

    setup(_context) {
      // No global setup required for this plugin
    },

    /**
     * Creates an instance of the image plugin.
     * @param {PluginV1InstanceContext} context
     * @param {IRI} subject
     * @returns {PluginV1Instance}
     */
    createPluginInstance(context, subject) {
      let mountedToElement = null;
      return {
        mount(element) {
          mountedToElement = element;
          (async () => {
            context.html.renderLoading(element);
            const canvas = document.createElement("canvas");
            const imgData = await loadImageData(subject);
            element.replaceChildren();
            displayImageData(imgData, canvas);
            element.appendChild(canvas);
          })();
        },
        unmount() {
          if (mountedToElement !== null) {
            mountedToElement.replaceChildren();
            mountedToElement = null;
          }
        },
      };
    },

    /**
     * Checks if the subject is an instance of any supported image type.
     */
    async isCompatible(context, subject) {
      const subjectTypes = await context.data.fetch.types(subject);
      const subjectTypeValues = subjectTypes.map((t) => t.value.value);
      const compatibleTypes = [
        image.gif,
        image.png,
        image.jpeg,
        image.svg,
        image.apng,
      ];
      // Use vocabulary service to check for semantically equivalent classes
      const imageTypeIris = compatibleTypes.flatMap((type) =>
        context.data.vocabulary.getSemanticallySimilar(type),
      );
      return subjectTypeValues.some((t) => imageTypeIris.includes(t));
    },
  };
}

// ---- Helper Functions ----

async function loadImageData(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function displayImageData(imageData, canvas) {
  const ctx = canvas.getContext("2d");

  canvas.width = imageData.width;
  canvas.height = imageData.height;

  ctx.putImageData(imageData, 0, 0);
}
