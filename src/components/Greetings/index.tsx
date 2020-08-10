import React from 'react'

import {Container, Image, Text} from './styles'
import {from} from "../../Utils";

const Greetings: React.FC = () => {
    return (
        <Container>
            <Image
                src="https://www.vectorlogo.zone/logos/reactjs/reactjs-icon.svg"
                alt="ReactJS logo"
            />
            <Text>An Electron boilerplate including TypeScript, React, Jest and ESLint.</Text>
            <p>{from(0).to(100).map(i => `${i}, `)}</p>
        </Container>
    )
}

export default Greetings
