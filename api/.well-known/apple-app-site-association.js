export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    applinks: {
      apps: [],
      details: [
        {
          appID: 'J39B2498YF.com.tabbitrabbit.app',
          paths: ['/bill/*'],
        },
      ],
    },
  });
}
