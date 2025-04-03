import { Prefab, ComponentTypes, prefabRegistry } from "aio3d-core";

export interface BackButtonConfig {
  onBackClick: () => void;
}

export const createBackButtonPrefab = (config: BackButtonConfig): Prefab => ({
  name: "BackButton",
  components: [
    {
      type: ComponentTypes.DOM_UI_ELEMENT,
      data: {
        elementType: "button",
        className: "back-button",
        content: "Back to Menu",
        parentSelector: ".game-ui",
      },
    },
    {
      type: ComponentTypes.DOM_UI_EVENT,
      data: {
        events: [
          {
            type: "click",
            handler: config.onBackClick,
          },
        ],
      },
    },
    {
      type: ComponentTypes.DOM_UI_STYLE,
      data: {
        background: "rgba(0, 0, 0, 0.7)",
        color: "white",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "4px",
        padding: "8px 16px",
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        textTransform: "uppercase",
        letterSpacing: "1px",
      },
    },
  ],
});
