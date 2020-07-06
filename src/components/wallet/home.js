import React from 'react';

import {Row, Col, Container, Button, Table, Form, Image, Modal} from 'react-bootstrap';

import {MDBDataTable} from 'mdbreact'

import {withRouter} from 'react-router-dom';

import {normalize_8decimals} from '../../utils/wallet_creation';

import {send_cash, send_tokens, stake_tokens, unstake_tokens, commit_txn} from "../../utils/wallet_actions";

import {get_staked_tokens, get_interest_map} from '../../utils/safexd_calls';

// Icon Imports
import {FaCogs, FaSearch} from 'react-icons/fa'
import {GiExitDoor} from 'react-icons/gi'
import {GrCubes} from 'react-icons/gr'
import {IconContext} from 'react-icons'

const openpgp = window.require('openpgp');

var nacl = window.require('tweetnacl');

var wallet;


class WalletHome extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            interface_view: 'home',
            address: '',
            wallet_path: '',
            cash: 0,
            tokens: 0,
            synced: false,
            wallet_height: 0,
            blockchain_height: 0,
            daemon_host: '',
            daemon_port: 0,
            usernames: [],
            connection_status: 'Connecting to the Safex Blockchain Network...',
            timer: '',
            first_refresh: false,
            show_keys: false,
            twm_offers: [],
            non_offers: [],
            selected_user: {}, //merchant element
            show_new_offer_form: false,
            show_new_account_form: false,
            blockchain_tokens_staked: 0,
            blockchain_interest_history: [],
            blockchain_current_interest: {},
            twm_file: {}
        };
    }

    async componentDidMount() {
        try {
            console.log(this.props.wallet);
            wallet = this.props.wallet;
            let twm_ls = localStorage.getItem('twm_file');
            console.log(twm_ls);
            let twm_file = JSON.parse(twm_ls);


            this.setState({
                wallet_height: wallet.blockchainHeight(),
                blockchain_height: wallet.daemonBlockchainHeight(),
                daemon_host: this.props.daemon_host,
                daemon_port: this.props.daemon_port,
                twm_file: twm_file
            });

            try {
                let gst_obj = {};
                gst_obj.interval = 0;
                gst_obj.daemon_host = this.props.daemon_host;
                gst_obj.daemon_port = this.props.daemon_port;
                let gst = await get_staked_tokens(gst_obj);
                try {
                    let height = wallet.daemonBlockchainHeight();
                    console.log(height);
                    if (height === 0) {
                        height = 95000;
                    }
                    let previous_interval = (height - (height % 100)) / 100;
                    let gim_obj = {};
                    gim_obj.begin_interval = previous_interval - 3;
                    gim_obj.end_interval = previous_interval + 1;
                    gim_obj.daemon_host = this.props.daemon_host;
                    gim_obj.daemon_port = this.props.daemon_port;

                    console.log(`gim object`);
                    console.log(gim_obj);
                    let gim = await get_interest_map(gim_obj);

                    this.setState({
                        blockchain_tokens_staked: gst.pairs[0].amount / 10000000000,
                        blockchain_interest_history: gim.interest_per_interval.slice(0, 4),
                        blockchain_current_interest: gim.interest_per_interval[4]
                    });
                } catch (err) {
                    console.error(err);
                    console.error(`error at getting the period interest`);
                }
            } catch (err) {
                console.error(err);
                console.error(`error at getting the staked tokens from the blockchain`);
            }
            if (wallet.connected() !== 'disconnected') {
                this.setState({connection_status: 'Connected to the Safex Blockchain Network'});

            } else {
                this.setState({connection_status: 'Unable to connect to the Safex Blockchain Network'});
            }
            if (wallet.synchronized()) {
                this.setState({synced: true});
            } else {
                const timer = setInterval(() => {
                    if (wallet.synchronized()) {
                        clearInterval(this.state.timer);
                    } else {
                        this.check();
                    }
                }, 1000);
                this.setState({timer: timer});
                this.setState({synced: false});
            }
            wallet.on('newBlock', function (height) {
                console.log("blockchain updated, height: " + height);
                this.setState({
                    blockchain_height: height
                });
            });
            wallet.on('refreshed', () => {
                console.log();
                this.refresh_action();
            });
            console.log(wallet.synchronized());

            this.setState({loading: false, address: wallet.address(), wallet: wallet});

            var accs = wallet.getSafexAccounts();

            console.log(accs);
            console.log(`accounts`);
            this.setState({usernames: accs, selected_user: {index: 0, username: accs[0].username}});
        } catch (err) {
            console.error(err);
            console.log("errors on startup");
        }
    };

    refresh_action = async () => {
        let m_wallet = wallet;
        console.log("refreshing rn");
        try {
            let gst_obj = {};
            gst_obj.interval = 0;
            gst_obj.daemon_host = this.state.daemon_host;
            gst_obj.daemon_port = this.state.daemon_port;
            let gst = await get_staked_tokens(gst_obj);
            try {
                let height = wallet.daemonBlockchainHeight();
                console.log(height);
                let previous_interval = (height - (height % 100)) / 100;
                let gim_obj = {};
                gim_obj.begin_interval = previous_interval - 3;
                gim_obj.end_interval = previous_interval + 1;
                gim_obj.daemon_host = this.state.daemon_host;
                gim_obj.daemon_port = this.state.daemon_port;

                console.log(`gim object`);
                console.log(gim_obj);
                let gim = await get_interest_map(gim_obj);

                this.setState({
                    blockchain_tokens_staked: gst.pairs[0].amount / 10000000000,
                    blockchain_interest_history: gim.interest_per_interval.slice(0, 4),
                    blockchain_current_interest: gim.interest_per_interval[4]
                });
            } catch (err) {
                console.error(err);
                console.error(`error at getting the period interest`);
            }
        } catch (err) {
            console.error(err);
            console.error(`error at getting the staked tokens from the blockchain`);
        }
        try {
            m_wallet.store().then(() => {
                console.log("wallet stored refresh");

                var accs = wallet.getSafexAccounts();


                this.setState({
                    address: m_wallet.address(),
                    pending_cash: normalize_8decimals(
                        Math.abs(m_wallet.balance() - m_wallet.unlockedBalance())
                    ),
                    synced: m_wallet.synchronized() ? true : false,
                    wallet_height: wallet.blockchainHeight(),
                    blockchain_height: wallet.daemonBlockchainHeight(),
                    cash: normalize_8decimals(m_wallet.unlockedBalance()),
                    pending_tokens: normalize_8decimals(m_wallet.tokenBalance() - m_wallet.unlockedTokenBalance()),
                    tokens: normalize_8decimals(m_wallet.unlockedTokenBalance()),
                    first_refresh: true,
                    usernames: accs
                });
            }).catch((err) => {
                console.log("unable to store wallet refresh: " + err);
                console.error(err);
            });
        } catch (err) {
            console.error(err);
            console.error("error getting height");
        }
    };

    check = () => {
        console.log(`wallet cash balance ${wallet.balance()}`);
        console.log(`wallet daemon blockchain height ${wallet.daemonBlockchainHeight()}`);
        console.log(`wallet synchronized status: ${wallet.synchronized()}`);
        console.log(`wallet height: ${wallet.blockchainHeight()}`);
        console.log(wallet.address());
        console.log(wallet.secretSpendKey());
        console.log(wallet.secretViewKey());
        if (wallet.connected() !== 'disconnected') {
            console.log(wallet.connected());
            console.log("wallet connected");
            //m_wallet.on('refreshed', this.refresh_action());
            this.props.wallet.on('newBlock', (height) => {
                console.log(height)
            });
            this.setState({connection_status: 'Connected to the Safex Blockchain Network'});
        } else {
            this.setState({connection_status: 'Unable to connect to the Safex Blockchain Network'});
        }
        if (wallet.synchronized()) {
            console.log("wallet synchronized");
            this.setState({
                synced: true,
                cash: normalize_8decimals(wallet.unlockedBalance()),
                blockchain_height: wallet.daemonBlockchainHeight(),
                wallet_height: wallet.blockchainHeight()
            });
        } else {
            this.setState({
                synced: false,
                blockchain_height: wallet.daemonBlockchainHeight(),
                wallet_height: wallet.blockchainHeight()
            });
        }
    };

    rescan = (e) => {
        let confirmed = window.confirm("are you sure you want to continue, " +
            "this will halt the wallet operation while the rescan is in progress");
        console.log(confirmed);
        if (confirmed) {
            wallet.off();
            wallet.rescanBlockchain();
            wallet.store().then(() => {
                console.log("wallet stored")
            }).catch((err) => {
                console.log("unable to store wallet: " + err)
            });
            wallet.on('refreshed', () => {
                console.log();
                this.refresh_action();
            });
        }
    };

    remove_account = async (user) => {
        try {
            let removed = wallet.removeSafexAccount(user);
            if (removed) {
                console.log(`successfully removed ${user}`);
            } else {
                console.error(`error at trying to remove ${user}`);
            }
        } catch (err) {
            console.error(err);
            console.error(`error at trying to remove an account`);
        }
    };


    register_account = async (e) => {
        e.preventDefault();
        if (this.state.tokens >= 5000 && this.state.first_refresh === true) {
            try {
                let vees = e.target;

                console.log(vees);

                let d_obj = {};
                d_obj.twm_version = 1;
                if (vees.avatar.value.length > 0) {
                    d_obj.avatar = vees.avatar.value;
                }
                if (vees.twitter.value.length > 0) {
                    d_obj.twitter = vees.twitter.value;
                }
                if (vees.facebook.value.length > 0) {
                    d_obj.facebook = vees.facebook.value;
                }
                if (vees.linkedin.value.length > 0) {
                    d_obj.linkedin = vees.linkedin.value;
                }
                if (vees.email.value.length > 0) {
                    d_obj.email_address = vees.email.value;
                }
                if (vees.biography.value.length > 0) {
                    d_obj.biography = vees.biography.value;
                }
                if (vees.website.value.length > 0) {
                    d_obj.website = vees.website.value;
                }
                if (vees.location.value.length > 0) {
                    d_obj.location = vees.location.value;
                }
                let account = wallet.createSafexAccount(e.target.username.value, JSON.stringify(d_obj));
                console.log(account);
                console.log(`account registered`);

                var accs = wallet.getSafexAccounts();

                console.log(accs);
                console.log(`accounts`);
                let mixins = e.target.mixins.value - 1;
                if (account) {
                    console.log(`let's register it`);

                    let confirm_registration = wallet.createAdvancedTransaction({
                        tx_type: '6',
                        safex_username: e.target.username.value,
                        mixin: mixins
                    }).then((tx) => {
                        console.log(tx);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${tx.fee() / 10000000000} SFX Safex Cash`);
                        let fee = tx.fee();
                        let txid = tx.transactionsIds();
                        if (confirmed_fee) {
                            tx.commit().then(async (commit) => {
                                console.log(commit);
                                console.log("committed transaction");
                                alert(`transaction successfully submitted 
                        transaction id: ${txid}
                        tokens locked for 500 blocks: 5000 SFT
                        fee: ${fee / 10000000000}`);

                            }).catch((err) => {
                                console.error(err);
                                console.error(`error at the committing of the account registration transaction`);
                                alert(`there was an error at committing the transaction to the blockchain`);
                            })
                        } else {
                            alert(`your transaction was cancelled, no account registration was completed`);
                        }
                    }).catch((err) => {
                        console.error(err);
                        alert(`error when committing the transaction: likely has not gone through`)
                    })
                } else {
                    alert(`not enough tokens`);
                }

            } catch (err) {
                console.error(err);
                console.error("error at the register account function");
            }
        } else {
            alert(`please wait until the wallet has fully loaded before performing registration actions`)
        }
    };

    //basic send transactions
    token_send = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to send ${e.target.amount.value} SFT Safex Tokens, ` +
                    `to ${e.target.destination.value}`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let token_txn = await send_tokens(wallet, e.target.destination.value, e.target.amount.value, mixins);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${token_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = token_txn.fee();
                        let txid = token_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {
                                let committed_txn = await commit_txn(token_txn);
                                console.log(committed_txn);
                                console.log(token_txn);
                                alert(`token transaction successfully submitted 
                                        transaction id: ${txid}
                                        amount: ${amount} SFT
                                        fee: ${fee / 10000000000} SFX`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error when trying to commit the token transaction to the blockchain`);
                                alert(`error when trying to commit the token transaction to the blockchain`);
                            }
                        } else {
                            console.log("token transaction cancelled");
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the token transaction formation it was not commited`);
                        alert(`error at the token transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the token transaction`);
        }
    };

    cash_send = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to send ${e.target.amount.value} SFX Safex Cash, ` +
                    `to ${e.target.destination.value}`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let cash_txn = await send_cash(wallet, e.target.destination.value, e.target.amount.value, mixins);
                        console.log(cash_txn);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${cash_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = cash_txn.fee();
                        let txid = cash_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {

                                let committed_txn = await commit_txn(cash_txn);
                                console.log(committed_txn);
                                console.log(cash_txn);
                                alert(`cash transaction successfully submitted 
                                        transaction id: ${txid}
                                        amount: ${amount}
                                        fee: ${fee / 10000000000}`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error at commiting the cash transaction to the blockchain network`);
                                alert(`error at commiting the cash transaction to the blockchain network`);
                            }
                        } else {
                            alert(`the cash transaction was cancelled`)
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the cash transaction formation it was not commited`);
                        alert(`error at the cash transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the cash transaction`);
        }
    };

    //view shifting
    go_home = () => {
        this.setState({interface_view: 'home'});
    };

    show_market = () => {
        var offrs = wallet.listSafexOffers(true);
        let non_offers = [];
        let twm_offers = [];

        for (var i in offrs) {/*
            console.log("Safex offer " + i + " title: " + offrs[i].title);
            console.log("Safex offer description: " + offrs[i].description);
            console.log("Safex offer quantity: " + offrs[i].quantity);
            console.log("Safex offer price: " + offrs[i].price);
            console.log("Safex offer minSfxPrice: " + offrs[i].minSfxPrice);
            console.log("Safex offer pricePegUsed: " + offrs[i].pricePegUsed);
            console.log("Safex offer pricePegID: " + offrs[i].pricePegID);
            console.log("Safex offer seller: " + offrs[i].seller);
            console.log("Safex offer active: " + offrs[i].active);
            console.log("Safex offer offerID: " + offrs[i].offerID);
            console.log("Safex offer currency: " + offrs[i].currency);
*/
            try {
                let offer_description = JSON.parse(offrs[i].description);
                if (offer_description.version > 0) {
                    offrs[i].descprition = offer_description;
                    twm_offers.push(offrs[i]);

                } else {
                    non_offers.push(offrs[i]);
                    console.log("not a twm structured offer");
                }

            } catch (err) {
                console.error(`error at parsing json from description`);
                console.error(err);
                non_offers.push(offrs[i]);
            }
        }

        this.setState({
            twm_offers: twm_offers,
            non_offers: non_offers,
            interface_view: 'market'
        });
    };

    show_merchant = () => {

        var offrs = wallet.listSafexOffers(true);
        let non_offers = [];
        let twm_offers = [];

        for (var i in offrs) {/*
            console.log("Safex offer " + i + " title: " + offrs[i].title);
            console.log("Safex offer description: " + offrs[i].description);
            console.log("Safex offer quantity: " + offrs[i].quantity);
            console.log("Safex offer price: " + offrs[i].price);
            console.log("Safex offer minSfxPrice: " + offrs[i].minSfxPrice);
            console.log("Safex offer pricePegUsed: " + offrs[i].pricePegUsed);
            console.log("Safex offer pricePegID: " + offrs[i].pricePegID);
            console.log("Safex offer seller: " + offrs[i].seller);
            console.log("Safex offer active: " + offrs[i].active);
            console.log("Safex offer offerID: " + offrs[i].offerID);
            console.log("Safex offer currency: " + offrs[i].currency);
*/
            try {
                let offer_description = JSON.parse(offrs[i].description);
                if (offer_description.version > 0) {
                    offrs[i].descprition = offer_description;
                    twm_offers.push(offrs[i]);

                } else {
                    non_offers.push(offrs[i]);
                    console.log("not a twm structured offer");
                }

            } catch (err) {
                console.error(`error at parsing json from description`);
                console.error(err);
                non_offers.push(offrs[i]);
            }
        }

        this.setState({
            twm_offers: twm_offers,
            non_offers: non_offers,
            interface_view: 'merchant'
        });
    };

    show_staking = () => {
        this.setState({interface_view: 'staking'})
    };

    show_settings = () => {
        this.setState({interface_view: 'settings'})
    };

    logout = () => {
        wallet.close(true)
            .then(() => {
                console.log("wallet closed")
                this.props.history.push({pathname: '/'});
            })
            .catch((e) => {
                console.log("unable to close wallet: " + e)
            });
    };

    //open new account


    //open new sell offer


    //close modal of private keys
    handleClose = () => {
        this.setState({show_keys: false});
    };

    //show modal of private keys
    handleShow = () => {
        this.setState({show_keys: true});
    };

    handleCloseNewOfferForm = () => {
        this.setState({show_new_offer_form: false});
    };

    handleShowNewOfferForm = () => {
        this.setState({show_new_offer_form: true});
    };

    handleCloseNewAccountForm = () => {
        this.setState({show_new_account_form: false});
    };

    handleShowNewAccountForm = () => {
        this.setState({show_new_account_form: true});
    };
    //merchant
    load_offers = (username, index) => {
        this.setState({selected_user: {username: username, index: index}});
        console.log(username);
        console.log(index);
    };

    list_new_offer = (e) => {
        e.preventDefault();
        e.persist();
        console.log(`let's register it`);
        let vees = e.target;

        let o_obj = {};
        o_obj.twm_version = 1;


        if (vees.description.value.length > 0) {
            o_obj.description = vees.description.value;
        }
        if (vees.main_image.value.length > 0) {
            o_obj.main_image = vees.main_image.value;
        }
        if (vees.sku.value.length > 0) {
            o_obj.sku = vees.sku.value;
        }
        if (vees.barcode.value.length > 0) {
            o_obj.barcode = vees.barcode.value;
        }
        if (vees.weight.value.length > 0) {
            o_obj.weight = vees.weight.value;
        }
        if (vees.country.value.length > 0) {
            o_obj.country = vees.country.value;
        }
        if (vees.message_type.value.length > 0) {
            o_obj.message_type = vees.message_type.value;
        }
        if (vees.physical.value.length > 0) {
            o_obj.physical = vees.physical.value;
        }

        try {
            let mixins = e.target.mixins.value - 1;
            let new_offer_transaction = wallet.createAdvancedTransaction({
                tx_type: '8',
                safex_username: e.target.username.value,
                safex_offer_title: e.target.title.value,
                safex_offer_price: e.target.price.value * 10000000000,
                safex_offer_quantity: e.target.quantity.value,
                safex_offer_description: JSON.stringify(o_obj),
                safex_offer_price_peg_used: 0,
                mixin: mixins
            }).then((tx) => {
                console.log(tx);
                let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${tx.fee() / 10000000000} SFX Safex Cash`);
                let fee = tx.fee();
                let txid = tx.transactionsIds();
                if (confirmed_fee) {
                    tx.commit().then(async (commit) => {
                        console.log(commit);
                        console.log("committed transaction");
                        alert(`transaction successfully submitted 
                        transaction id: ${txid}
                        fee: ${fee / 10000000000}`);

                    }).catch((err) => {
                        console.error(err);
                        console.error(`error at the committing of the account registration transaction`);
                        alert(`there was an error at committing the transaction to the blockchain`);
                    })
                } else {
                    alert(`your transaction was cancelled, no account registration was completed`);
                }

            }).catch((err) => {
                console.error(err);
                alert(`error when committing the transaction: likely has not gone through`)
            })
        } catch (err) {
            console.error(err);
            console.error("error at listing the offer");
        }
    };

    make_token_stake = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to stake ${e.target.amount.value} SFT Safex Tokens?`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let stake_txn = await stake_tokens(wallet, e.target.amount.value, mixins);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${stake_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = stake_txn.fee();
                        let txid = stake_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {
                                let committed_txn = await commit_txn(stake_txn);
                                console.log(committed_txn);
                                console.log(stake_txn);
                                alert(`token staking transaction successfully submitted 
                                        transaction id: ${txid}
                                        amount: ${amount} SFT
                                        fee: ${fee / 10000000000} SFX`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error when trying to commit the token staking transaction to the blockchain`);
                                alert(`error when trying to commit the token staking transaction to the blockchain`);
                            }
                        } else {
                            console.log("token staking transaction cancelled");
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the token staking transaction formation it was not commited`);
                        alert(`error at the token staking transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the token transaction`);
        }
    };

    make_token_unstake = async (e) => {
        e.preventDefault();
        e.persist();
        try {
            let mixins = e.target.mixins.value - 1;
            if (mixins >= 0) {
                let confirmed = window.confirm(`are you sure you want to stake ${e.target.amount.value} SFT Safex Tokens?`);
                console.log(confirmed);
                if (confirmed) {
                    try {
                        let unstake_txn = await unstake_tokens(wallet, e.target.amount.value, mixins);
                        let confirmed_fee = window.confirm(`the fee to send this transaction will be:  ${unstake_txn.fee() / 10000000000} SFX Safex Cash`);
                        let fee = unstake_txn.fee();
                        let txid = unstake_txn.transactionsIds();
                        let amount = e.target.amount.value;
                        if (confirmed_fee) {
                            try {
                                let committed_txn = await commit_txn(unstake_txn);
                                console.log(committed_txn);
                                console.log(unstake_txn);
                                alert(`token unstake transaction committed  
                                        transaction id: ${txid}
                                        amount: ${amount} SFT
                                        fee: ${fee / 10000000000} SFX`);
                            } catch (err) {
                                console.error(err);
                                console.error(`error when trying to commit the token staking transaction to the blockchain`);
                                alert(`error when trying to commit the token staking transaction to the blockchain`);
                            }
                        } else {
                            console.log("token staking transaction cancelled");
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the token staking transaction formation it was not commited`);
                        alert(`error at the token staking transaction formation it was not commited`);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.toString().startsWith('not enough outputs')) {
                alert(`choose fewer mixins`);
            }
            console.error(`error at the token transaction`);
        }
    };


    register_twmapi = async (user, twm_api_url = 'http://127.0.0.1:17700 ') => {
        console.log(user);

        //here we contact the api and check if this user is already registered or not.
        //if it is, let's download the data.
        //if it isn't let's generate for this user the pgp keys and pack them sign them and register with the api.

        //edit twm file and save
        let twm_file = this.state.twm_file;

        if (twm_file.accounts.hasOwnProperty(user)) {

        }
        try {
            const key = await openpgp.generateKey({
                rsaBits: 4096,                                              // RSA key size
                passphrase: this.state.password           // protects the private key
            });
            let keys = nacl.sign.keyPair.fromSecretKey(Buffer.from(this.state.usernames[0].privateKey));
            console.log(keys);

            console.log(this.state.usernames[0].privateKey);
            console.log(this.state.usernames[0].publicKey);

            console.log(String.fromCharCode.apply(null, keys.secretKey));
        } catch (err) {
            console.error(err);
        }
    };

    to_ellipsis = (text) => {
        const text_to_ellipse = text

        const ellipse = `${text_to_ellipse.substring(0, 10)}.....${text_to_ellipse.substring(text_to_ellipse.length - 10, text_to_ellipse.length)}`

        return (
            ellipse
        )

    }

    copyAddressToClipboard = () => {
        alert("This button is not wokring :/")
    }


    render() {
        const twmwallet = () => {
            switch (this.state.interface_view) {

                case "home": {

                    // Creates the accounts table variable
                    var accounts_table = this.state.usernames.map((user, key) => {
                        console.log(user);
                        console.log(key);
                        try {
                            let usee_d = JSON.parse(user.data);

                            return <Row className="account_element" key={key}>
                                <Col sm={4}>
                                    <Image width={100} height={100} src={require("./../../img/sails-logo.png")/*usee_d.avatar*/} roundedCircle/>
                                </Col>
                                <Col sm={8}>
                                    <ul>
                                        <li>{user.username}</li>
                                        <li>{usee_d.location}</li>
                                        <li>{usee_d.biography}</li>
                                        <li>{usee_d.website}</li>
                                        <li>{usee_d.twitter}</li>
                                        {user.status == 0 ? (
                                            <li>
                                                <button onClick={() => this.remove_account(user.username)}>Remove
                                                </button>
                                            </li>
                                        ) : ''}
                                    </ul>
                                </Col>
                            </Row>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                    }
                    // End of creating the accounts table variable

                     // Creates the new items table variable
                     /*
                    var new_listings_table = this.state.twm_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            return <tr key={key}>
                                <td>{listing.title}</td>
                                <td>{listing.quantity}</td>
                                <td>{listing.price / 10000000000}</td>
                                <td>{listing.seller}</td>
                                <td>{listing.offerID}</td>
                            </tr>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });
                    */
                    // End of creating new items table variable


                    });
                    return (
                        <Row lg>
                           
                                <Col sm={4}>
                                   
                                        <div className="wallet-box mb-2 mr-2 ml-2 p-2 font-size-small">
                                           
                                            <h3> Safex Cash </h3> 

                                            <ul>
                                                <li>{this.state.cash} SFX</li>

                                                {this.state.pending_cash > 0 ?
                                                    (<li>{this.state.pending_cash} Pending</li>) : ''}

                                                {this.state.pending_cash > 0 ?
                                                    (<li>{this.state.cash + this.state.pending_cash} NET</li>) : ''}
                                            </ul>

                                            <Form id="send_cash" onSubmit={this.cash_send}>
                                                Destination Address <Form.Control name="destination"
                                                                                    defaultValue="Safex5..."
                                                                                    placedholder="the destination address"/>
                                                Amount (SFX)<Form.Control name="amount" defaultValue="0"
                                                                            placedholder="the amount to send"/>
                                                Mixin Ring Size <Form.Control name="mixins" defaultValue="7"
                                                                                placedholder="choose the number of mixins"/>
                                                <Button className="mt-2 safex-cash-green" type="submit" size="lg" block>
                                                    Send Cash
                                                </Button>
                                            </Form>
                                                
                                        </div>
                                    

                                    
                                        <div className="wallet-box m-2 p-2 font-size-small">

                                            <h3> Safex Token </h3>
                                                
                                            <ul>
                                                <li>{this.state.tokens} SFT</li>
                                                {this.state.pending_tokens > 0 ?
                                                    (<li>{this.state.pending_tokens} Pending</li>) : ''}
                                                {this.state.pending_tokens > 0 ?
                                                    (
                                                        <li>{this.state.tokens + this.state.pending_tokens} NET</li>) : ''}
                                            </ul>  

                                            <Form id="send_token" onSubmit={this.token_send}>
                                                Destination Address <Form.Control name="destination"
                                                                                    defaultValue="Safex5..."
                                                                                    placedholder="the destination address"/>
                                                Amount (SFT)<Form.Control name="amount" defaultValue="0"
                                                                                placedholder="the amount to send"/>
                                                Mixin Ring Size <Form.Control name="mixins" defaultValue="7"
                                                                                placedholder="choose the number of mixins"/>
                                                <Button className="mt-2" type="submit" variant="warning" size="lg" block>
                                                    Send Tokens
                                                </Button>
                                            </Form>
                                        </div>
                                   
                                </Col>

                                
                                <Col className="accounts" sm={8}>
                                    <div className="account-list">
                                        <h2 className="text-center m-2"> Accounts </h2>
                                        {accounts_table}
                                       
                                    </div>
                                    
                                </Col>
                        </Row>
                    );
                }
                case "market":
                    var twm_listings_table = this.state.twm_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            return <tr className="white-text" key={key}>
                                <td>{listing.title}</td>
                                <td>{listing.quantity}</td>
                                <td>{listing.price / 10000000000}</td>
                                <td>{listing.seller}</td>
                                <td>{listing.offerID}</td>
                            </tr>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });

                    var non_listings_table = this.state.non_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            return <tr key={key}>
                                <td>{listing.title}</td>
                                <td>{listing.quantity}</td>
                                <td>{listing.price / 10000000000}</td>
                                <td>{listing.seller}</td>
                                <td>{this.to_ellipsis(listing.offerID)}</td>
                                <td><select className="light-blue-back" id="quantity">
                                    <option value="1">1</option>
                                </select></td>
                                <td>
                                    <Button variant="success">BUY</Button>
                                </td>
                                <td>
                                    <Button variant="info">CONTACT</Button>
                                </td>
                            </tr>

                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });
                    return (
                        <div className="overflow-y">
                            <Row>
                                <Col className="max-h500px white-text overflow-y" md={12}>
                                    <Col
                                        className="search-box d-flex flex-column align-items-center border border-white light-blue-back">

                                        <div class="row width100 border-bottom border-white" id="search">
                                            <form className="width100 no-gutters p-2" id="search-form" action=""
                                                  method="POST" enctype="multipart/form-data">
                                                <div class="form-group col-sm-9">
                                                    <input class="form-control" type="text"
                                                           placeholder="eg. api.theworldmarketplace.com"/>
                                                </div>
                                                <div class="form-group col-sm-3">
                                                    <button type="submit" class="btn btn-block btn-primary">Set Market
                                                        API
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                        <div class="row" id="search">
                                            <form className="no-gutters p-2" id="search-form" action="" method="POST"
                                                  enctype="multipart/form-data">
                                                <div class="form-group col-sm-9">
                                                    <input class="form-control" type="text" placeholder="Search"/>
                                                </div>
                                                <div class="form-group col-sm-3">
                                                    <button type="submit" class="btn btn-block btn-primary">Search
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                        <div class="row" id="filter">
                                            <form>
                                                <div class="form-group col-sm-3 col-xs-6">
                                                    <select data-filter="category" class="filter-make filter form-control">
                                                        <option value="">Category</option>
                                                        <option value="">Any</option>
                                                        <option value="">Category</option>
                                                        <option value="">Books</option>
                                                        <option value="">Clothes</option>
                                                        <option value="">Digital</option>
                                                        <option value="">Toys</option>
                                                    </select>
                                                </div>
                                                <div class="form-group col-sm-3 col-xs-6">
                                                    <select data-filter="location"
                                                            class="filter-model filter form-control">
                                                        <option value="">Location</option>
                                                        <option value="">Any</option>
                                                        <option value="">Africa</option>
                                                        <option value="">Asia</option>
                                                        <option value="">Africa</option>
                                                        <option value="">Europe</option>
                                                        <option value="">North America</option>
                                                        <option value="">South America</option>
                                                    </select>
                                                </div>
                                                <div class="form-group col-sm-3 col-xs-6">
                                                    <select data-filter="price" class="filter-type filter form-control">
                                                        <option value="">Price Range</option>
                                                        <option value="">$0 - $24.99</option>
                                                        <option value="">$25 - $49.99</option>
                                                        <option value="">$50 - $199.99</option>
                                                        <option value="">$200 - $499.99</option>
                                                        <option value="">$500 - $999.99</option>
                                                        <option value="">$1000+</option>
                                                    </select>
                                                </div>
                                                <div class="form-group col-sm-3 col-xs-6">
                                                    <select data-filter="sort"
                                                            class="filter-price filter form-control">
                                                        <option value="">Sort by...</option>
                                                        <option value="">$$$ Asc</option>
                                                        <option value="">$$$ Dec</option>
                                                        <option value="">Rating Asc</option>
                                                        <option value="">Rating Dec</option>
                                                    </select>
                                                </div>
                                            </form>
                                        </div>

                                    </Col>

                                    {this.state.twm_offers.length > 1 ? (
                                        <Table color="white" className="white-text border border-white b-r10">
                                            <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Quantity</th>
                                                <th>Price (SFX)</th>
                                                <th>Seller</th>
                                                <th>Offer ID</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {twm_listings_table}
                                            </tbody>
                                        </Table>) : (<div></div>)}

                                    <Table>
                                        <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Quantity</th>
                                            <th>Price (SFX)</th>
                                            <th>Seller</th>
                                            <th>Offer ID</th>
                                            <th>Actions</th>
                                            <th></th>
                                            <th></th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {non_listings_table}
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
                        </div>);
                case "merchant": {
                    var twm_listings_table = this.state.twm_offers.map((listing, key) => {
                        console.log(key);
                        try {
                            if (listing.seller === this.state.selected_user.username) {
                                return <tr key={key}>
                                    <td>{listing.title}</td>
                                    <td>{listing.quantity}</td>
                                    <td>{listing.price / 10000000000}</td>
                                    <td>{listing.seller}</td>
                                    <td>{listing.offerID}</td>
                                </tr>
                            }
                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }

                    });

                    var non_listings_table = this.state.non_offers.map((listing, key) => {
                        console.log(listing);
                        try {
                            if (listing.seller === this.state.selected_user.username) {
                                return <tr key={key}>
                                    <td>{listing.title}</td>
                                    <td>{listing.quantity}</td>
                                    <td>{listing.price / 10000000000}</td>
                                    <td>{listing.seller}</td>
                                    <td>{listing.offerID}</td>
                                    <td>
                                        <Button>edit</Button>
                                    </td>
                                </tr>
                            }
                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }
                    });
                    var accounts_table = this.state.usernames.map((user, key) => {
                        console.log(user);
                        console.log(key);
                        try {
                            let usee_d = JSON.parse(user.data);

                            return <Row
                                className={this.state.selected_user.username === user.username ? "selected_account_element" : "account_element"}
                                key={key} onClick={() => this.load_offers(user.username, key)}>
                                <Col>
                                    <Image width={80} height={80} src={usee_d.avatar} roundedCircle/>
                                </Col>
                                <Col>
                                    <ul>
                                        <li>{user.username}</li>
                                        <li>{usee_d.location}</li>
                                        <li>{usee_d.biography}</li>
                                        <li>{usee_d.website}</li>
                                        <li>{usee_d.twitter}</li>
                                        {user.status == 0 ? (
                                            <li>
                                                <button onClick={() => this.remove_account(user.username, key)}>remove
                                                </button>
                                            </li>
                                        ) : ''}
                                    </ul>
                                </Col>
                            </Row>
                        } catch (err) {
                            console.error(`failed to properly parse the user data formatting`);
                            console.error(err);
                        }
                    });
                    try {
                        var selected = this.state.usernames[this.state.selected_user.index];
                        if (selected) {
                            console.log(selected);
                            var data = JSON.parse(selected.data);
                        } else {
                            console.log(`no user selected`);
                        }
                    } catch (err) {
                        console.error(err);
                        console.error(`error at the point of parsing selected user data`);
                    }
                    try {
                        return (
                            <Row>
                                <Col sm={4}>
                                    <Row>
                                        <Button variant="primary" onClick={this.handleShowNewAccountForm}>
                                            New Account
                                        </Button>

                                        <Modal animation={false} show={this.state.show_new_account_form}
                                               onHide={this.handleCloseNewAccountForm}>
                                            <Modal.Header closeButton>
                                                <Modal.Title>List a new offer to sell</Modal.Title>
                                            </Modal.Header>
                                            <Modal.Body>
                                                <Form id="create_account" onSubmit={this.register_account}>
                                                    username <Form.Control name="username"
                                                                           placedholder="enter your desired username"/>
                                                    avatar url <Form.Control name="avatar"
                                                                             placedholder="enter the url of your avatar"/>
                                                    twitter link <Form.Control name="twitter" defaultValue="twitter.com"
                                                                               placedholder="enter the link to your twitter handle"/>
                                                    facebook link <Form.Control name="facebook"
                                                                                defaultValue="facebook.com"
                                                                                placedholder="enter the to of your facebook page"/>
                                                    linkedin link <Form.Control name="linkedin"
                                                                                defaultValue="linkedin.com"
                                                                                placedholder="enter the link to your linkedin handle"/>
                                                    biography <Form.Control as="textarea" name="biography"
                                                                            placedholder="type up your biography"/>
                                                    website <Form.Control name="website" defaultValue="safex.org"
                                                                          placedholder="if you have your own website: paste your link here"/>
                                                    location <Form.Control name="location" defaultValue="Earth"
                                                                           placedholder="your location"/>
                                                    email address <Form.Control name="email"
                                                                                defaultValue="xyz@example.com"
                                                                                placedholder="your location"/>
                                                    mixins <Form.Control name="mixins" defaultValue="7"
                                                                         placedholder="your location"/>

                                                    <Button variant="primary" type="submit">create account</Button>
                                                </Form>
                                            </Modal.Body>
                                            <Modal.Footer>

                                                <Button variant="secondary" onClick={this.handleCloseNewAccountForm}>
                                                    Close
                                                </Button>
                                            </Modal.Footer>
                                        </Modal>
                                    </Row>

                                    <Row className="account-list">
                                        {accounts_table}
                                    </Row>
                                    {selected !== void (0) ? (<Row className="merchant_profile_view">
                                        <Col>
                                            <Row>
                                                <ul>
                                                    <li><Image width={100} height={100} src={data.avatar}
                                                               roundedCircle/>
                                                    </li>
                                                    <li>username: {selected.username}</li>
                                                </ul>
                                            </Row>
                                            <Row>
                                                <Button>Edit</Button>
                                                <Button>Remove</Button>
                                                <Button onClick={() => this.register_twmapi(selected)}>Register
                                                    API</Button>
                                            </Row>
                                        </Col>
                                    </Row>) : ''}

                                </Col>
                                <Col className="merchant_product_view" sm={8}>
                                    {selected !== void (0) ? (
                                        <Row>
                                            <Button variant="primary" onClick={this.handleShowNewOfferForm}>
                                                New Offer
                                            </Button>

                                            <Modal animation={false} show={this.state.show_new_offer_form}
                                                   onHide={this.handleCloseNewOfferForm}>
                                                <Modal.Header closeButton>
                                                    <Modal.Title>List a new offer to sell</Modal.Title>
                                                </Modal.Header>
                                                <Modal.Body>
                                                    <Form id="list_new_offer" onSubmit={this.list_new_offer}>
                                                        username <Form.Control name="username"
                                                                               value={selected.username}/>
                                                        thumbnail image url <Form.Control name="thumbnail"/>
                                                        title <Form.Control name="title"/>
                                                        description <Form.Control as="textarea" name="description"/>
                                                        price SFX <Form.Control name="price"/>
                                                        available quantity <Form.Control name="quantity"/>
                                                        SKU <Form.Control name="sku"/>
                                                        Barcode (ISBN, UPC, GTIN, etc) <Form.Control name="barcode"/>

                                                        Message Type <Form.Control name="message_type"/>
                                                        Weight <Form.Control name="weight"/>
                                                        Physical Item? <Form.Control name="physical" value="true"/>
                                                        Country of Origin <Form.Control name="country"
                                                                                            defaultValue="Earth"
                                                                                            placedholder="your location"/>
                                                        mixins <Form.Control name="mixins" defaultValue="7"
                                                                             placedholder="your location"/>
                                                        <Button type="submit">List Offer</Button>
                                                    </Form>
                                                </Modal.Body>
                                                <Modal.Footer>
                                                    <Button variant="secondary" onClick={this.handleCloseNewOfferForm}>
                                                        Close
                                                    </Button>
                                                </Modal.Footer>
                                            </Modal>
                                        </Row>) : ''}
                                    <Row className="offer__container">
                                        {this.state.twm_offers.length > 1 ? (<Table className="offer__container">
                                            <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Quantity</th>
                                                <th>Price (SFX)</th>
                                                <th>Seller</th>
                                                <th>Offer ID</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {twm_listings_table}
                                            </tbody>
                                        </Table>) : (<div></div>)}
                                    </Row>

                                    <Row className="overflow-y">
                                        <Table>
                                            <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Quantity</th>
                                                <th>Price (SFX)</th>
                                                <th>Seller</th>
                                                <th>Offer ID</th>
                                                <th>Actions</th>
                                                <th></th>
                                                <th></th>

                                            </tr>
                                            </thead>

                                            <tbody>
                                            {non_listings_table}
                                            </tbody>
                                        </Table>
                                    </Row>
                                </Col>
                            </Row>);
                    } catch (err) {
                        console.log(err);
                        alert(err);
                        return (<div><p>error loading</p></div>);
                    }
                }
                case "staking": {
                    let staked_tokens = wallet.stakedTokenBalance() / 10000000000;
                    let unlocked_tokens = wallet.unlockedStakedTokenBalance() / 10000000000;
                    let pending_stake = (staked_tokens - unlocked_tokens);
                    let interval = [0, 0, 0, 0];
                    let interest = [0, 0, 0, 0];

                    try {
                        for (const [i, bit] of this.state.blockchain_interest_history.entries()) {
                            console.log(`bit ${bit}`);
                            interval[i] = bit.interval * 100;
                            interest[i] = bit.cash_per_token / 10000000000;
                        }

                    } catch (err) {
                        console.error(err);
                        console.error(`error at the interval loading of stacking`);
                    }


                    return (
                        
                            <Row className="wallet no-gutters flex-column border-bottom border-white">

                                <h2 className="text-center m-2"> Staking </h2>
                                <Row className="no-gutters">
                                    <Col className="wallet-box mb-2 mr-2 ml-2 p-2 font-size-small">
                                        
                                    <h3 className="text-center m-2"> Stake Tokens </h3>

                                        <Form id="stake_tokens" onSubmit={this.make_token_stake}>
                                            Amount (SFT)<Form.Control name="amount" defaultValue="0"
                                                                        placedholder="The amount to stake"/>
                                            Mixin Ring Size <Form.Control name="mixins" defaultValue="7"
                                                                        placedholder="Choose the number of mixins"/>
                                            <Button className="mt-2" type="submit" variant="warning" size="lg" block>
                                                Stake Tokens
                                            </Button>
                                        </Form>
                                
                                    </Col>
                                    <Col className="height-fit-content align-self-center dark-orange">
                                        <Table>
                                            <thead>
                                                <tr>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <li>{this.state.cash} SFX</li>
                                                        {this.state.pending_cash > 0 ?
                                                            (<li>{this.state.pending_cash} Pending</li>) : ''}
                                                        {this.state.pending_cash > 0 ?
                                                            (
                                                            <li>{this.state.cash + this.state.pending_cash} NET</li>) : ''}
                                                    </td>
                                                </tr>

                                                <tr>
                                                    <td>
                                                        <li>{this.state.tokens} SFT</li>
                                                        {this.state.pending_tokens > 0 ?
                                                            (<li>{this.state.pending_tokens} Pending</li>) : ''}
                                                        {this.state.pending_tokens > 0 ?
                                                            (
                                                        <li>{this.state.tokens + this.state.pending_tokens} NET</li>) : ''}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <li>Total Staked Tokens: {this.state.blockchain_tokens_staked}</li>
                                                    </td>
                                                </tr>

                                                <tr>
                                                    <td>
                                                        <li>Your Total Staked Tokens: {unlocked_tokens} {pending_stake > 0 ? (
                                                            <span>| {pending_stake} pending</span>) : ''}</li>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <li>Current Block: {this.state.blockchain_height}</li>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <li>Next Payout: {100 - (this.state.blockchain_height % 100)} Blocks</li>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <li>
                                                            Interest Accrued: {this.state.blockchain_current_interest.cash_per_token / 10000000000} SFX
                                                            per token
                                                        </li>
                                                    </td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <tf>
                                                        <li>Block Interval {interval[0] * 10} : {interest[0]} SFX per token  </li>     
                                                    </tf>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                        
                                        
                                    </Col>
                                    
                                    <Col className="wallet-box mb-2 mr-2 ml-2 p-2 font-size-small">

                                        <h3 className="text-center m-2"> Unstake Tokens </h3>

                                        <select className="dark-orange" id="stakes">
                                            <option value="">Choose Stake ID</option>
                                        </select>

                                        <Form id="unstake_tokens" onSubmit={this.make_token_unstake}>

                                            Amount (SFT) (MAX: {unlocked_tokens})<Form.Control name="amount"
                                                                                                    defaultValue="0"
                                                                                                    placedholder="the amount to send"/>
                                            Mixin Ring Size <Form.Control name="mixins" defaultValue="7"
                                                                            placedholder="choose the number of mixins"/>
                                            <Button className="mt-2" type="submit" variant="danger" size="lg" block>
                                                Unstake and Collect
                                            </Button>
                                        </Form>
                                    
                                    </Col>
                                </Row>
                                <Col className="mt-2 search-box border border-white grey-back">

                                <h2 className="text-center "> Stakes </h2>

                                <Table color="white" className="white-text border border-white b-r10 light-blue-back ">
                                            <thead className="dark-orange">
                                                <tr>
                                                    <th>TXID</th>
                                                    <th>Amount (SFT)</th>
                                                    <th>Interest (SFX)</th>
                                                    <th>Block</th>
                                                
                                                </tr>
                                            </thead>
                                            <tbody>
                                            
                                            </tbody>
                                        </Table>

                                </Col>
                            </Row>
                        
                    );
                }
                case "settings":
                    return (<div></div>);

                default:
                    return <h1>Major Error</h1>
            }
        };


        return (
            <Container className="height100 justify-content-between whtie-text" fluid>
                <Container fluid className="no-gutters mt-5 mb-2 p-2 border border-light b-r10 white-text">

                    <Row className="justify-content-between align-items-center">

                        <Col sm={2} className="p-1 align-self-center b-r10 light-blue-back">

                            <div className="d-flex flex-row justify-content-center align-items-end">
                                <IconContext.Provider value={{color: 'white', size: '20px'}}>
                                    <div className="white-text">
                                        <GrCubes className="m-1 white-text"/>
                                    </div>
                                </IconContext.Provider>
                                <p className="mb-2"><b>{this.state.blockchain_height}</b></p>
                            </div>

                            {this.state.wallet_height < this.state.blockchain_height ?
                                (<p className="mb-2">
                                    {this.state.wallet_height} / {this.state.blockchain_height}
                                </p>) : ''}
                            <p className="mb-2">{this.state.connection_status}</p>

                        </Col>

                        <div className="menu-logo">
                            <Image className=" align-content-center" src={require("./../../img/sails-logo.png")}/>
                        </div>

                        <Col sm={7} className="menu">
                            <ul className="menu__list">
                                <li className="menu__list-item">
                                    <a className="menu__link" href="javascript:void(0)"
                                       onClick={this.go_home}>Home</a>
                                </li>
                                <li className="menu__list-item">
                                    <a className="menu__link" href="javascript:void(0)"
                                       onClick={this.show_market}>Market</a>
                                </li>
                                <li className="menu__list-item">
                                    <a className="menu__link" href="javascript:void(0)"
                                       onClick={this.show_merchant}>Merchant</a>
                                </li>
                                <li className="menu__list-item">
                                    <a className="menu__link" href="javascript:void(0)"
                                       onClick={this.show_staking}>Staking</a>
                                </li>


                            </ul>

                        </Col>
                        <div className="d-flex flex-column">
                            <a className="menu__link" href="javascript:void(0)"
                               onClick={this.show_settings}><FaCogs className="m-3"/></a>


                            <a className="menu__link" href="javascript:void(0)"
                               onClick={this.logout}><GiExitDoor className="m-3"/></a>
                        </div>
                    </Row>


                    <Row
                        className="no-gutters p-2 justify-content-between align-items-center b-r10 grey-back white-text">
                        <Col sm={3}>
                            <li className="mr-2">
                                SFX: {this.state.cash}
                            </li>
                            <li className="">
                                SFT: {this.state.tokens}
                            </li>
                        </Col>
                        <Col className="just" sm={5}>
                            <p>SFX + SFT Public Address: <b>{this.to_ellipsis(this.state.address)}</b></p>
                            <Button onClick={this.copyAddressToClipboard}>
                                Copy Address
                            </Button>
                        </Col>
                        <Col className="d-flex justify-content-center mr-2" sm={3}>

                            {this.state.synced === false ? (
                                <Button className="m-1" onClick={this.check}>
                                    Check
                                </Button>) : ''}

                            <Button className="m-1" variant="danger" onClick={this.rescan}>
                                Hard Rescan
                            </Button>

                            <Button className="m-1" variant="primary" onClick={this.handleShow}>
                                Show Keys
                            </Button>

                            <Modal className="width100 black-text" animation={false} show={this.state.show_keys}
                                   onHide={this.handleClose}>
                                <Modal.Header closeButton>
                                    <Modal.Title>Your Private Keys</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    <ul>
                                        <li>
                                            <b>Address:</b> <br/> {this.props.wallet.address()}
                                        </li>
                                        <li>
                                            <b>Secret Spend Key:</b> <br/> {this.props.wallet.secretSpendKey()}
                                        </li>
                                        <li>
                                            <b>Secret View Key:</b> <br/> {this.props.wallet.secretViewKey()}
                                        </li>
                                        <li>
                                            <b>Mnemonic Seed:</b> <br/> {this.props.wallet.seed().toUpperCase()}
                                        </li>
                                    </ul>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={this.handleClose}>
                                        Close
                                    </Button>
                                </Modal.Footer>
                            </Modal>

                        </Col>
                    </Row>
                </Container>

                {twmwallet()}


            </Container>
        );
    }
}

export default withRouter(WalletHome);