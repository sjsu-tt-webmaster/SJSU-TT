module.exports = {
  siteMetadata: {
    title: 'SJSU Theta Tau Website',
    description: 'A Gatsby.js Starter based on Photon by HTML5 UP'
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'gatsby-starter-default',
        short_name: 'starter',
        start_url: '/',
        background_color: '#663399',
        theme_color: '#663399',
        display: 'minimal-ui',
        icon: 'src/assets/images/website-icon.png' // This path is relative to the root of the site.
      }
    },
    'gatsby-plugin-sass',
    'gatsby-plugin-offline'
  ]
};
