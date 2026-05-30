import DefaultTheme from "vitepress/theme";
import PackageManagerTabs from "./PackageManagerTabs.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("PackageManagerTabs", PackageManagerTabs);
  },
};
