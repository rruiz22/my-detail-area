/**
 * MDAChat Widget Container
 *
 * This component provides a dedicated route for the MDAChat live chat widget
 * to load its interface without interference from React Router.
 *
 * The widget loads at /lc/widget and needs its own space to render.
 */
const MDAChatWidget = () => {
  return (
    <div
      id="mdachat-widget-container"
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden'
      }}
    />
  );
};

export default MDAChatWidget;
