import React from 'react';

import { Row } from 'react-bootstrap';

import ReactTooltip from "react-tooltip";

// Icon Imports
import { AiOutlineInfoCircle } from 'react-icons/ai'

import { IconContext } from 'react-icons'

import './ComponentCSS/SendSafex.css'

export default function SendSafex(props) {

    return (
       
            <form className={`send-safex-box ${props.style}`} id={props.id} onSubmit={props.send}>

                <div>

                    { props.title }

                    <IconContext.Provider  value={{color: '#767676', size: '25px'}}>
                        <AiOutlineInfoCircle className="ml-2 mb-2" data-tip data-for='sendSafexInfo' />
                        
                        <ReactTooltip 
                            className="entry-tooltip-container" 
                            id='sendSafexInfo' 
                            effect='solid'
                            place="right"
                        >
                            <span>
                                How to send?
                                <br/>
                                <br/>
                                1. The address that you are sending safex to should start with 
                                "Safex" and contain 95-105 characters.<br/>
                                Example: Safex5zHGtYQYE41yEzLTRQWiajC5keyJHVwQamarNyp9ssouD87bbGhobVnYAtUEQa4me79ybZev2AmLUnbds4PRYv3P1KmW6j2F
                                <br/>
                                <br/>
                                2. The amount that you are sending has to be grater than 0.
                                The transaction fee will be added on to the amount you are sending.
                            </span>
                        </ReactTooltip>
                    </IconContext.Provider>

                </div>
                    
                <input
                    name="destination"
                    placeholder="Safex5..."
                />

                <input
                    name="amount"
                    placeholder="How much to send?"
                    type="number"
                />


                <Row>
                    <div className={`mixins-label ${props.style}`}>
                        <IconContext.Provider value={{color: '#767676', size: '25px'}}>
                            <AiOutlineInfoCircle data-tip data-for='mixinInfo'
                                        className=""/>

                            <ReactTooltip id='mixinInfo' type='info' effect='solid' place="right">
                                <span>
                                    Mixins are transactions that have also been sent on the Safex blockchain. <br/>
                                    They are combined with yours for private transactions.<br/>
                                    Changing this from the default could hurt your privacy.<br/>
                                </span>
                            </ReactTooltip>
                        </IconContext.Provider>

                        <div>
                            <label>Mixins:</label>
                        </div>

                    </div>

                    <select className="w-25" name="mixins" defaultValue="7">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                        <option>4</option>
                        <option>5</option>
                        <option>6</option>
                        <option>7</option>
                    </select>
                </Row>
                    

                <button className={`custom-button-send ${props.style}`} type="submit">
                    SEND
                </button>
            </form>

    )
}