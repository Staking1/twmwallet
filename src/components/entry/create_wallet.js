import React from "react";
import { Row, Col, Container, Form, Image } from "react-bootstrap";
import { create_wallet_util } from "../../utils/wallet_creation";

import WalletHome from "../wallet/home";
import { open_twm_file, save_twm_file } from "../../utils/twm_actions";
import ProgressIcon from "../customComponents/ProgressIcon";

import Loader from "react-loader-spinner";

import { AiOutlineInfoCircle } from "react-icons/ai";
import { IoIosArrowBack } from "react-icons/io";
import { IconContext } from "react-icons";
import ReactTooltip from "react-tooltip";

const crypto = window.require("crypto");

let { dialog } = window.require("electron").remote;

export default class CreateWallet extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      daemon_host: "",
      daemon_port: 0,
      new_path: "",
      password: "",
      safex_key: null,
      success: false,
      network: "stagenet",
      testnet: false,
      wallet: null,
      wallet_made: false,
      loading: false,
      pageNumber: 1,
    };
    this.wallet_meta = null;
  }

  async componentDidMount() {}

  set_path = (e) => {
    e.preventDefault();

    let sails_path = dialog.showSaveDialogSync();
    let new_path = sails_path;

    try {
      if (new_path.length > 0) {
        this.setState({ new_path: new_path });
      }
    } catch (err) {
      console.log("Error! No path set.");
    }
  };

  change_path = (e) => {
    e.preventDefault();
    this.setState({ new_path: "" });
  };

  set_daemon_state = (e) => {
    e.preventDefault();
    this.setState({
      daemon_host: e.target.daemon_host.value,
      daemon_port: parseInt(e.target.daemon_port.value),
    });
  };

  change_daemon = (e) => {
    e.preventDefault();
    alert("hey");
    this.setState({ daemon_host: "", daemon_port: 0 });
  };

  set_password = (e) => {
    e.preventDefault();
    if (e.target.password.value === e.target.repeat_password.value) {
      this.setState({ password: e.target.password.value, pageNumber: 4 });
    } else {
      alert("Your passwords dont match! Please try again.");
    }
  };

  change_password = (e) => {
    e.preventDefault();
    this.setState({ password: "" });
  };

  make_wallet_result = async (error, wallet) => {
    if (error) {
      this.setState({ loading: false });
    } else {
      try {
        console.log(wallet);
        wallet.setSeedLanguage("English");
        try {
          let twm_obj = {};

          twm_obj.version = 1;
          twm_obj.api = {};
          twm_obj.api.urls = {};
          /*twm_obj.api.urls.theworldmarketplace = {};
                    twm_obj.api.urls.theworldmarketplace.url = 'api.theworldmarketplace.com';*/
          twm_obj.accounts = {};
          twm_obj.settings = {};

          //for each account make one, and within an account you have urls and keys  the top lvel api urls is for top level non account actions
          var accs = wallet.getSafexAccounts();
          for (const acc of accs) {
            console.log(acc);
            twm_obj.accounts[acc.username] = {};
            twm_obj.accounts[acc.username].username = acc.username;
            twm_obj.accounts[acc.username].data = acc.data;
            twm_obj.accounts[acc.username].safex_public_key = acc.publicKey;
            twm_obj.accounts[acc.username].safex_private_key = acc.privateKey;
            twm_obj.accounts[acc.username].urls = {};
            /*
                                                twm_obj.accounts[acc.username].urls.theworldmarketplace = {};
                                                twm_obj.accounts[acc.username].urls.theworldmarketplace.url = 'api.theworldmarketplace.com';
                        */
          }

          const algorithm = "aes-256-ctr";
          const cipher = crypto.createCipher(algorithm, this.state.password);
          let crypted = cipher.update(JSON.stringify(twm_obj), "utf8", "hex");
          crypted += cipher.final("hex");

          const hash1 = crypto.createHash("sha256");
          hash1.update(JSON.stringify(twm_obj));
          console.log(`password ${this.state.password}`);
          console.log(JSON.stringify(twm_obj));

          let twm_save = await save_twm_file(
            this.state.new_path + ".twm",
            crypted,
            this.state.password,
            hash1.digest("hex")
          );

          try {
            let twm_file = await open_twm_file(
              this.state.new_path + ".twm",
              this.state.password
            );
            console.log(twm_file);

            localStorage.setItem("twm_file", JSON.stringify(twm_file.contents));
          } catch (err) {
            this.setState({ loading: false });
            console.error(err);
            console.error(`error opening twm file after save to verify`);
          }
          console.log(twm_save);
        } catch (err) {
          this.setState({ loading: false });
          console.error(err);
          console.error(`error at initial save of the twm file`);
        }
        this.setState({ wallet_made: true, wallet: wallet, loading: false });
      } catch (err) {
        this.setState({ loading: false });
        console.error(err);
        console.error(`error at open_wallet_result`);
      }
    }
  };

  make_wallet = async (e) => {
    e.preventDefault();
    this.setState({ loading: true });
    try {
      let daemon_string = `${this.state.daemon_host}:${this.state.daemon_port}`;
      create_wallet_util(
        this.state.new_path,
        this.state.password,
        0,
        this.state.network,
        daemon_string,
        this.make_wallet_result
      );
    } catch (err) {
      this.setState({ loading: false });
      console.error(err);
      console.error("error on initial recovery");
    }
  };

  backToSelect = () => {
    this.props.history.push({ pathname: "/select_entry" });
  };

  goBack = (e) => {
    e.preventDefault();
    if (this.state.pageNumber > 1) {
        return this.setState({pageNumber: this.state.pageNumber - 1});
    } 

    this.backToSelect();
  };

  get isLoading() {
      return this.state.loading === true;
  }

  render() {
      if (this.isLoading) {
        return (
        <Container fluid className="h-100">
            <Container
            fluid
            className="height100 d-flex flex-column justify-content-center align-items-center"
          >
         <Loader type="ThreeDots" color="#13D3FD" height={40} width={80} />
         </Container>
        </Container>)
      }

    return (
      <Container
        fluid
        className={`h-100 ${this.state.wallet_made ? "background-entry-fix" : ""}`}
      >
        {this.state.wallet_made ? (
          <Container fluid className="height100 justify-content-between">
            <WalletHome
              wallet={this.state.wallet}
              daemon_host={this.state.daemon_host}
              daemon_port={this.state.daemon_port}
              password={this.state.password}
              wallet_path={this.state.new_path}
            />
          </Container>
        ) : (
          <Container
            fluid
            className="height100 d-flex flex-column justify-content-center align-items-center"
          >
            <Container className="h-100 d-flex flex-column justify-content-center align-items-center">
              <Image
                className="entry-mini-logo"
                src={require("./../../img/safex-multi-small.svg")}
              />
              <Image className="plant" src={require("./../../img/plant.svg")} />
              <Image
                className="plant2"
                src={require("./../../img/corner-plant.svg")}
              />
              <Image
                className="entry-scene"
                src={require("./../../img/entry-scene.svg")}
              />
              <Image
                className="entry-scene1"
                src={require("./../../img/entry-scene1.svg")}
              />
              <Image
                onClick={() => {
                  alert("Closing Wallet... (TEST)");
                }}
                className="entry-off-button"
                src={require("./../../img/off.svg")}
              />

              <Row className="entry-progress-row">
                <Col
                  onClick={this.goBack}
                  className="d-flex align-items-center entry-back-text pointer"
                  md={2}
                >
                  <IconContext.Provider
                    value={{ color: "#13D3FD", size: "3rem" }}
                  >
                    <IoIosArrowBack />
                  </IconContext.Provider>
                  BACK
                </Col>

                <a
                  onClick={() => {
                    this.setState({ pageNumber: 1 });
                  }}
                >
                  <ProgressIcon
                    number={1}
                    color={
                      this.state.pageNumber === 1
                        ? "progress-icon-color"
                        : this.state.new_path.length > 0
                        ? "progress-icon-color-complete"
                        : ""
                    }
                    title={"SAVE FILES"}
                  />
                </a>

                <a
                  onClick={() => {
                    this.setState({ pageNumber: 2 });
                  }}
                >
                  <ProgressIcon
                    number={2}
                    title={"NETWORK CONNECTION"}
                    color={
                      this.state.pageNumber === 2
                        ? "progress-icon-color"
                        : this.state.daemon_host.length > 0
                        ? "progress-icon-color-complete"
                        : ""
                    }
                  />
                </a>

                <a
                  onClick={() => {
                    this.setState({ pageNumber: 3 });
                  }}
                >
                  <ProgressIcon
                    number={3}
                    title={"YOUR PASSWORD"}
                    color={
                      this.state.pageNumber === 3
                        ? "progress-icon-color"
                        : this.state.password.length > 0
                        ? "progress-icon-color-complete"
                        : ""
                    }
                  />
                </a>
              </Row>

              {this.state.wallet_made && (
                <Container fluid className="height100 justify-content-between">
                  <WalletHome
                    wallet={this.state.wallet}
                    daemon_host={this.state.daemon_host}
                    daemon_port={this.state.daemon_port}
                    password={this.state.password}
                    wallet_path={this.state.new_path}
                  />
                </Container>
              )}

              {this.state.pageNumber === 1 ? (
                <div>
                  {this.state.new_path.length > 0 ? (
                    <div className="entry-container">
                      <Col className="justify-content-around d-flex flex-column">
                        <p>
                          {" "}
                          This file will be saved to:{" "}
                          <i>{this.state.new_path}</i>
                        </p>

                        <button
                          className="mx-auto custom-button-entry"
                          onClick={this.change_path}
                        >
                          Change Path
                        </button>

                        <button
                          className="mx-auto custom-button-entry orange-border"
                          onClick={() => this.setState({ pageNumber: 2 })}
                        >
                          Continue
                        </button>
                      </Col>
                    </div>
                  ) : (
                    <div className="entry-container">
                      <p>
                        Where would you like to save your Safex Wallet Files?
                      </p>
                      <Form
                        className="mt-2 mb-2"
                        id="set_path"
                        onSubmit={this.set_path}
                      >
                        <input className="display-none" type="file" />
                        <Col className="justify-content-around d-flex flex-column">
                          <button
                            className="mx-auto custom-button-entry orange-border my-5"
                            type="submit"
                            variant="primary"
                            size="lg"
                          >
                            Select File Path
                          </button>
                        </Col>
                      </Form>
                    </div>
                  )}
                </div>
              ) : (
                ""
              )}

              {this.state.new_path.length > 0 && this.state.pageNumber === 2 ? (
                <div className="entry-container">
                  <div className="entry-info-div">
                    <IconContext.Provider
                      value={{ color: "#767676", size: "30px" }}
                    >
                      <AiOutlineInfoCircle data-tip data-for="daemonHostInfo" />

                      <ReactTooltip
                        className="entry-tooltip-container"
                        id="daemonHostInfo"
                        effect="solid"
                        place="bottom"
                      >
                        <span>
                          This is the URL used to connect to the Safex
                          blockchain.
                          <br />
                          You can use the default provided by the Safex
                          Foundation
                          <br />
                          or replace it with your own full node.
                          <br />
                          <br />
                          <ul className="mb-4">
                            <li>
                              The default self hosted wallet setup would be:
                            </li>
                            <li className="mt-4">
                              HOST: <b>127.0.0.1</b>
                            </li>
                            <li className="mt-1">
                              PORT: <b>17402</b>
                            </li>
                            <li className="mt-2">
                              The default is rpc.safex.org:30393
                            </li>
                          </ul>
                        </span>
                      </ReactTooltip>
                    </IconContext.Provider>
                  </div>
                  {this.state.daemon_host.length < 1 ? (
                    <form
                      id="set_daemon"
                      onSubmit={this.set_daemon_state}
                      className=""
                    >
                      <label className="entry-form-label" htmlFor="daemon-host">
                        Daemon Host:
                      </label>

                      <input
                        id="daemon-host"
                        className="my-2 entry-form-input"
                        name="daemon_host"
                        defaultValue="stagenetrpc.safex.org"
                        placedholder="set the ip address of the safex blockchain"
                      />

                      <label htmlFor="daemon-port">Daemon Port:</label>

                      <input
                        id="daemon-port"
                        className="mt-2 mb-5"
                        name="daemon_port"
                        defaultValue="30393"
                        placedholder="set the port of the safex blockchain"
                      />

                      <button
                        className="custom-button-entry orange-border"
                        type="submit"
                        variant="primary"
                        size="lg"
                      >
                        Set Connection
                      </button>
                    </form>
                  ) : (
                    <div className="d-flex flex-column justify-content-around h-100">
                      <p>
                        You will be connected to:
                        <br />
                        <i>
                          {this.state.daemon_host}:{this.state.daemon_port}
                        </i>
                      </p>

                      <button
                        className="custom-button-entry"
                        type="button"
                        onClick={() =>
                          this.setState({ daemon_host: "", daemon_port: 0 })
                        }
                      >
                        Reset Connection
                      </button>

                      <button
                        className="mx-auto custom-button-entry orange-border"
                        onClick={() => this.setState({ pageNumber: 3 })}
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                ""
              )}

              {this.state.pageNumber === 3 ? (
                <div className="entry-container">
                  <form
                    id="set_password"
                    className=""
                    onSubmit={this.set_password}
                  >
                    <label htmlFor="password-input">Choose a password</label>

                    <input
                      id="password-input"
                      type="password"
                      name="password"
                      className="mt-2 mb-2"
                    />

                    <label htmlFor="repeat-password-input">
                      Confirm your password
                    </label>

                    <input
                      id="repeat-password-input"
                      name="repeat_password"
                      className="mt-2 mb-2"
                      type="password"
                    />

                    <button
                      type="submit"
                      className="custom-button-entry orange-border my-5"
                    >
                      Set Password
                    </button>
                  </form>
                </div>
              ) : (
                ""
              )}

              {this.state.new_path.length > 0 &&
              this.state.daemon_host.length > 0 &&
              this.state.wallet_made === false &&
              this.state.password.length > 0 &&
              this.state.pageNumber === 4 ? (
                <div className="entry-container">
                  <p>
                    This file will be saved to: <i>{this.state.new_path}</i>
                  </p>

                  <button
                    autoFocus
                    onClick={this.make_wallet}
                    className="my-5 mx-auto custom-button-entry orange-border"
                  >
                    Create New Wallet
                  </button>
                </div>
              ) : (
                ""
              )}

              <Row className="w-100 entry-footer">
                <p className="user-select-none">THE WORLD MARKETPLACE</p>
              </Row>
            </Container>
          </Container>
        )}
      </Container>
    );
  }
}
