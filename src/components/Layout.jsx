import React from 'react';

import Header from './Header';
import Footer from './Footer';
import NavBar from './NavBar';

class Layout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: 'is-loading'
    };
  }

  componentDidMount() {
    this.timeoutId = setTimeout(() => {
      this.setState({ loading: '' });
    }, 100);
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  render() {
    const { children, loading } = this.props;

    return (
      <div className={`body ${loading}`}>
        <NavBar />
        <Header />
        {children}
        <Footer />
      </div>
    );
  }
}

export default Layout;
